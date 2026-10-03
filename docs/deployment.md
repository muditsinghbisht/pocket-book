# Deployment

PocketBook is a static site. `npm run build` writes everything to `dist/`, and the GitHub workflow in `.github/workflows/deploy.yml` uploads it to a private S3 bucket served through CloudFront at `https://pocketbook.muditsinghbisht.in`.

Pull requests run lint, typecheck, tests and the build. Pushes to `main` also deploy.

Replace `ACCOUNT_ID`, `BUCKET`, `DIST_ID` and `REGION` below with your values.

## 1. S3 bucket

1. Create a bucket, for example `pocketbook-muditsinghbisht-in`, in your usual region.
2. Keep **Block all public access** on. CloudFront reads the bucket privately (step 4).
3. Leave static website hosting off. Do not enable versioning unless you want rollbacks (see the end).

## 2. TLS certificate

CloudFront only accepts certificates from **us-east-1**.

1. In ACM (region `us-east-1`), request a public certificate for `pocketbook.muditsinghbisht.in`.
2. Choose DNS validation. Add the CNAME record ACM shows to the DNS of `muditsinghbisht.in`.
3. Wait until the status is **Issued**.

## 3. CloudFront Function

PocketBook has real directory pages such as `/caching/`. S3 does not map `/caching/` to `/caching/index.html`, so add a viewer-request function.

CloudFront → Functions → Create function (runtime `cloudfront-js-2.0`), name `pocketbook-directory-index`:

```js
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // /caching -> /caching/ (keeps relative asset URLs correct)
  if (uri !== "/" && uri.indexOf(".") === -1 && uri.slice(-1) !== "/") {
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: { location: { value: uri + "/" } },
    };
  }

  // /caching/ -> /caching/index.html
  if (uri.slice(-1) === "/") {
    request.uri = uri + "index.html";
  }

  return request;
}
```

Publish it. The hash part of a URL (`#eviction/lru`) never reaches CloudFront, so only top-level paths need this.

## 4. CloudFront distribution

Create a distribution:

- **Origin**: the S3 bucket (REST endpoint, not the website endpoint). Choose **Origin access control (OAC)** and create a new one. Let CloudFront offer the bucket policy.
- **Viewer protocol policy**: Redirect HTTP to HTTPS.
- **Allowed methods**: GET, HEAD.
- **Cache policy**: `CachingOptimized`. **Compress objects automatically**: on.
- **Function associations**: viewer request → `pocketbook-directory-index`.
- **Alternate domain name**: `pocketbook.muditsinghbisht.in`, with the ACM certificate from step 2.
- **Default root object**: `index.html`.
- **HTTP versions**: HTTP/2 and HTTP/3.

If the console does not apply the bucket policy for you, add it to the bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontRead",
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::BUCKET/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DIST_ID"
        }
      }
    }
  ]
}
```

Optional: add custom error responses so a missing page shows something friendly. S3 returns 403 (not 404) for missing keys when the caller cannot list the bucket.

## 5. DNS

In the DNS for `muditsinghbisht.in`, add a record for `pocketbook`:

- **Route 53**: an `A` alias (and `AAAA` alias) to the CloudFront distribution.
- **Another provider**: a `CNAME` from `pocketbook` to `dxxxxxxxx.cloudfront.net`.

## 6. GitHub OIDC role

If your portfolio already deploys with OIDC, the identity provider exists. Reuse it and only create a new role. Otherwise create the provider first: URL `https://token.actions.githubusercontent.com`, audience `sts.amazonaws.com`.

Create a role (for example `pocketbook-github-deploy`) with this trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:muditsinghbisht/pocket-book:ref:refs/heads/main"
        }
      }
    }
  ]
}
```

The `sub` condition means only pushes to `main` of this repository can assume the role. Pull requests cannot.

Attach this permissions policy (least privilege):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::BUCKET"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject"],
      "Resource": "arn:aws:s3:::BUCKET/*"
    },
    {
      "Effect": "Allow",
      "Action": ["cloudfront:CreateInvalidation"],
      "Resource": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DIST_ID"
    }
  ]
}
```

## 7. GitHub secrets

Repository → Settings → Secrets and variables → Actions → New repository secret:

| Secret                       | Value                                            |
| ---------------------------- | ------------------------------------------------ |
| `AWS_ROLE_ARN`               | ARN of the role from step 6                      |
| `AWS_REGION`                 | the bucket's region, for example `ap-south-1`    |
| `S3_BUCKET_NAME`             | bucket name only, no `s3://` prefix              |
| `CLOUDFRONT_DISTRIBUTION_ID` | the distribution ID, for example `E1ABCDEF12345` |

## 8. First deploy and checks

1. Push to `main` and watch the **CI and Deploy** run in the Actions tab.
2. Open `https://pocketbook.muditsinghbisht.in/` and `https://pocketbook.muditsinghbisht.in/caching/`.
3. In DevTools → Application, check that the service worker is registered and the manifest loads.
4. Check headers on `sw.js` (`cache-control: no-cache`) and a file in `assets/` (`max-age=31536000, immutable`).
5. Reload offline to confirm the precache works.

## Notes

- **Build once**: the deploy job downloads the exact `dist/` that the CI job tested.
- **No `--delete` for `assets/`**: old hashed chunks stay in S3 so a browser holding an older page keeps working. Clean them up occasionally, or add an S3 lifecycle rule for objects under `assets/` older than, say, 90 days.
- **Updates**: each deploy changes the service worker's cache name, so returning visitors get the "New content available" toast.
- **Rollback**: re-run an earlier successful workflow run (the build is rebuilt from that commit), or `git revert` and push.
- **Cost**: for a site this size, S3 and CloudFront usage is typically very low. Check the current AWS pricing for your region and traffic.

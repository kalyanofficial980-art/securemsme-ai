# SecureMSME AI QA Checklist

Run this before every deployment.

## Automated checks

```powershell
npm.cmd run audit:app
npm.cmd run e2e
npm.cmd run audit:npm
```

## Manual checks

- Signup works
- Login works
- Dashboard opens after login
- Add website works
- Manual scan works
- Saved website rescan works
- Report page opens
- PDF download works
- Printable report works
- Admin page opens only for admin
- Legal pages load
- Trust page loads
- Robots and sitemap work

## Advanced checks

- Run Lighthouse on homepage
- Check mobile layout
- Check no sensitive secrets are committed
- Check `.env.local` is not in Git
- Check Supabase RLS is enabled
- Check free test scan limit before production

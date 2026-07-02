# SecureMSME AI Security Audit Notes

## Mega Part 58: Advanced Crawler + Asset Discovery v2

Added:

- Advanced crawler run table
- Discovered assets table
- Link edge graph
- Form inventory
- Asset discovery snapshots
- Crawler events
- Safe same-origin crawler engine
- Asset classification
- Form signal extraction
- Login/admin/API/checkout/customer-data counters
- Asset fingerprints
- Coverage score
- Asset risk score
- Admin crawler observability

## Purpose

This part maps website attack surface safely:

- pages
- forms
- login surfaces
- admin surfaces
- API/docs surfaces
- checkout/payment signals
- customer-data forms
- robots.txt
- sitemap.xml
- internal link graph

## Safety boundary

The crawler:

- uses GET only
- stays same-origin
- does not submit forms
- does not login
- does not brute force
- does not run payloads
- does not mutate data
- does not extract private data

## Professional use

Use crawler results before:

- Vulnerability Scanner
- Evidence Warehouse
- Accuracy Foundation
- Advanced Vulnerability Correlation
- Developer Fix Plan
- Client Report

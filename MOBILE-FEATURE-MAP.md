# iOS feature map

| Windows feature | iPhone / iPad build |
|---|---|
| Arrangement Studio | Included; touch-first single-column layout on phones, expanded layout on iPad/landscape |
| Multitrack recording | Included through Web Audio/getUserMedia with iOS microphone permission |
| Recording journal / recovery | Included; IndexedDB remains app-local |
| Comping / punch recording | Included |
| InfectedTune / Precision Tune | Included |
| Pocket / Precision Pocket | Included |
| Core 3 mixer / buses / EQ / compression | Included |
| Shared delay / reverb | Included |
| Core 5 automation / sidechain | Included |
| GRIM rack | Included |
| LUFS / true-peak producer mastering | Included |
| WAV / stems / project ZIP export | Included through native share sheet; 256 MB per-file mobile safety cap |
| Classic Studio | Included |
| MP3 encoder | Included in the local web payload |
| Existing account / access | Uses the same guarded device-v1 account API; no Stripe checkout or code redemption CTA in the iOS binary |
| Owner controls | Existing account UI retained where compatible |
| Host switching | Mobile Settings; HTTPS origin only |
| Windows self-updater | Replaced by App Store-managed updates |
| Core 6 collaboration client | Included, but only activates against a compatible Core 6 server |
| Voice chat | WebRTC/Web Audio path; production TURN is required for restrictive networks |

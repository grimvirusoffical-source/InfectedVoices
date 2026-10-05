import { THIRD_PARTY_NOTICES } from '../lib/thirdPartyLicenses'
import { STUDIO_VERSION } from '../version'

/** About screen: version plus third-party license notices (LGPL notice and source link for SoundTouch). */
export function AboutLicenses() {
  return (
    <section className="panel">
      <h2>About</h2>
      <p className="panel-lead">Infected Voices Studio {STUDIO_VERSION}</p>
      <div className="settings-group" data-testid="about-licenses">
        <h3>Open-source licenses</h3>
        {THIRD_PARTY_NOTICES.map((n) => (
          <div className="take" key={n.name}>
            <div>
              <strong>
                {n.name} {n.version}
              </strong>
              <div className="muted">{n.usedFor}.</div>
              <div className="muted">{n.copyright}.</div>
              <div className="muted">
                Licensed under the{' '}
                <a href={n.licenseUrl} target="_blank" rel="noreferrer">
                  {n.license}
                </a>
                . It ships unmodified as a separate file (<code>{n.shippedFile}</code>), which you may replace with a
                compatible modified build. License text:{' '}
                <a href={`./${n.licenseFile}`} target="_blank" rel="noreferrer">
                  {n.licenseFile}
                </a>
                . Source code:{' '}
                <a href={n.sourceUrl} target="_blank" rel="noreferrer">
                  {n.sourceUrl}
                </a>
                .
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

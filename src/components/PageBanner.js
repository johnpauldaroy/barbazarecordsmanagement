function ActionLink({ href, label, secondary = false }) {
  return (
    <a
      href={href}
      className={secondary ? 'page-banner__link page-banner__link--secondary' : 'page-banner__link'}
    >
      {label}
    </a>
  );
}

function PageBanner({ eyebrow, title, description, primaryAction, secondaryAction }) {
  return (
    <section className="page-banner panel panel--feature">
      <div className="page-banner__content">
        <span className="section-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="page-banner__actions">
          {primaryAction ? <ActionLink {...primaryAction} /> : null}
          {secondaryAction ? <ActionLink {...secondaryAction} secondary /> : null}
        </div>
      )}
    </section>
  );
}

export default PageBanner;

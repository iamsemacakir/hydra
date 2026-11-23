<#import "field.ftl" as field>
<#import "footer.ftl" as loginFooter>
<#--
  Hydra login theme: the page frame of Hydra's own sign-in page (/signin) around Keycloak's forms.

  Copied from theme/keycloak.v2/login/template.ftl in Keycloak 26.6.3 and changed in four places:
  1. <head>: Hydra's theme script (Auto, Light, Dark) replaces the prefers-color-scheme script, plus the
     Geist font and a Hydra icon.
  2. The header shows the Hydra brand and a theme switch instead of the realm name.
  3. The form sits on a card on the left; an inverse panel with services orbiting Hydra sits on the right.
  4. Messages carry Hydra's status glyphs (shape plus word) instead of Font Awesome icons.
  Everything Keycloak relies on is unchanged: the stylesheets and scripts of keycloak.v2, the ids
  (kc-page-title, kc-attempted-username, reset-login, try-another-way, ...) and every nested section.
-->
<#macro username>
  <#assign label>
    <#if !realm.loginWithEmailAllowed>${msg("username")}<#elseif !realm.registrationEmailAsUsername>${msg("usernameOrEmail")}<#else>${msg("email")}</#if>
  </#assign>
  <@field.group name="username" label=label>
    <div class="${properties.kcInputGroup}">
      <div class="${properties.kcInputGroupItemClass} ${properties.kcFill}">
        <span class="${properties.kcInputClass} ${properties.kcFormReadOnlyClass}">
          <input id="kc-attempted-username" value="${auth.attemptedUsername}" readonly>
        </span>
      </div>
      <div class="${properties.kcInputGroupItemClass}">
        <button id="reset-login" class="${properties.kcFormPasswordVisibilityButtonClass} kc-login-tooltip" type="button"
              aria-label="${msg('restartLoginTooltip')}" onclick="location.href='${url.loginRestartFlowUrl}'">
            <i class="fa-sync-alt fas" aria-hidden="true"></i>
            <span class="kc-tooltip-text">${msg("restartLoginTooltip")}</span>
        </button>
      </div>
    </div>
  </@field.group>
</#macro>

<#-- Status glyphs, as on the landing page: filled circle = OK, triangle = problem, hollow circle = unknown. -->
<#macro hydraGlyph kind>
  <svg class="hydra-glyph" data-kind="${kind}" width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" focusable="false"><#if kind == "healthy"><circle cx="6" cy="6" r="4"/><#elseif kind == "problem" || kind == "warning"><path d="M6 1.5 10.8 10.2H1.2Z"/><#else><circle cx="6" cy="6" r="4.25"/></#if></svg>
</#macro>

<#-- The brand mark: a small dependency tree on a rounded square, as in Brand.tsx. -->
<#macro hydraBrand>
  <svg class="hydra-logo" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false">
    <rect class="hydra-logo-plate" width="28" height="28" rx="8"/>
    <path class="hydra-logo-stroke" d="M14 20.5V15M14 15 8.6 9.6M14 15l5.4-5.4M14 15V8.6" stroke-width="1.7" stroke-linecap="round"/>
    <circle class="hydra-logo-dot" cx="14" cy="20.5" r="2.1"/>
    <circle class="hydra-logo-dot" cx="8.6" cy="8.8" r="1.9"/>
    <circle class="hydra-logo-dot" cx="14" cy="7.6" r="1.9"/>
    <circle class="hydra-logo-dot" cx="19.4" cy="8.8" r="1.9"/>
  </svg>
  <span class="hydra-brand-name">Hydra</span>
</#macro>

<#-- One segment of the theme switch. Icons are Lucide (ISC), as in the web app. -->
<#macro hydraThemeOption value label hint>
  <button type="button" class="hydra-theme-option" data-theme-option="${value}" aria-pressed="false" title="${label}. ${hint}">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <#if value == "auto">
        <path d="M12 8a2.83 2.83 0 0 0 4 4 4 4 0 1 1-4-4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.3 17.7-1.4 1.4"/><path d="m19.1 4.9-1.4 1.4"/>
      <#elseif value == "light">
        <circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>
      <#else>
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
      </#if>
    </svg>
    <span class="hydra-sr-only">${label}</span>
  </button>
</#macro>

<#macro registrationLayout bodyClass="" displayInfo=false displayMessage=true displayRequiredFields=false>
<#-- The sign-in pages get the lede and the password note of /signin; other pages show only their own content. -->
<#assign hydraSignIn = ["login", "login-username", "login-password"]?seq_contains(pageId)>
<!DOCTYPE html>
<html class="${properties.kcHtmlClass!}" lang="${lang}"<#if realm.internationalizationEnabled> dir="${(locale.rtl)?then('rtl','ltr')}"</#if> data-landing-pref="${darkMode?then('auto', 'light')}" data-landing-theme="light">

<head>
    <meta charset="utf-8">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="color-scheme" content="light${darkMode?then(' dark', '')}">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <#if properties.meta?has_content>
        <#list properties.meta?split(' ') as meta>
            <meta name="${meta?split('==')[0]}" content="${meta?split('==')[1]}"/>
        </#list>
    </#if>
    <title>${title!}</title>
    <#if darkMode>
    <#-- Sets the theme on <html> before the first paint, so the page never flashes the wrong theme. -->
    <script src="${url.resourcesPath}/js/hydra-theme.js"></script>
    </#if>
    <link rel="icon" type="image/svg+xml" href="${url.resourcesPath}/img/favicon.svg" />
    <link rel="preload" href="${url.resourcesPath}/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossorigin />
    <#if properties.stylesCommon?has_content>
        <#list properties.stylesCommon?split(' ') as style>
            <link href="${url.resourcesCommonPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <#if properties.styles?has_content>
        <#list properties.styles?split(' ') as style>
            <link href="${url.resourcesPath}/${style}" rel="stylesheet" />
        </#list>
    </#if>
    <script type="importmap">
        {
            "imports": {
                "rfc4648": "${url.resourcesCommonPath}/vendor/rfc4648/rfc4648.js"
            }
        }
    </script>
    <#if properties.scripts?has_content>
        <#list properties.scripts?split(' ') as script>
            <script src="${url.resourcesPath}/${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <#if scripts??>
        <#list scripts as script>
            <script src="${script}" type="text/javascript"></script>
        </#list>
    </#if>
    <script type="module" src="${url.resourcesPath}/js/passwordVisibility.js"></script>
    <script type="module">
        <#outputformat "JavaScript">
        import { startSessionPolling } from ${(url.resourcesPath + "/js/authChecker.js")?c};

        startSessionPolling(
            ${url.ssoLoginInOtherTabsUrl?c}
        );
        </#outputformat>
    </script>
    <script type="module">
        document.addEventListener("click", (event) => {
            const link = event.target.closest("a[data-once-link]");

            if (!link) {
                return;
            }

            if (link.getAttribute("aria-disabled") === "true") {
                event.preventDefault();
                return;
            }

            const { disabledClass } = link.dataset;

            if (disabledClass) {
                link.classList.add(...disabledClass.trim().split(/\s+/));
            }

            link.setAttribute("role", "link");
            link.setAttribute("aria-disabled", "true");
        });
    </script>
    <#if authenticationSession??>
        <script type="module">
             <#outputformat "JavaScript">
            import { checkAuthSession } from ${(url.resourcesPath + "/js/authChecker.js")?c};

            checkAuthSession(
                ${authenticationSession.authSessionIdHash?c}
            );
            </#outputformat>
        </script>
    </#if>
    <script>
      // Workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1404468
      const isFirefox = true;
    </script>
</head>

<body id="keycloak-bg" class="${properties.kcBodyClass!} hydra" data-page-id="login-${pageId}">
<div class="hydra-page">
  <header id="kc-header" class="hydra-top">
    <#if (client.baseUrl)?has_content>
      <a class="hydra-brand" href="${client.baseUrl}"><@hydraBrand/></a>
    <#else>
      <span class="hydra-brand"><@hydraBrand/></span>
    </#if>
    <#if darkMode>
      <div class="hydra-theme" role="group" aria-label="${msg("hydraThemeLabel")}">
        <@hydraThemeOption value="auto" label=msg("hydraThemeAuto") hint=msg("hydraThemeAutoHint")/>
        <@hydraThemeOption value="light" label=msg("hydraThemeLight") hint=msg("hydraThemeLightHint")/>
        <@hydraThemeOption value="dark" label=msg("hydraThemeDark") hint=msg("hydraThemeDarkHint")/>
      </div>
    </#if>
  </header>

  <div class="hydra-main">
    <main class="hydra-form-side" aria-labelledby="kc-page-title">
      <div class="hydra-card">
        <p class="hydra-pill"><span class="hydra-pill-dot" aria-hidden="true"></span>${msg("hydraWorkspace")}</p>

        <div class="hydra-head">
          <h1 class="hydra-title<#if !hydraSignIn> hydra-title-sm</#if>" id="kc-page-title"><#nested "header"></h1>
          <#if realm.internationalizationEnabled  && locale.supported?size gt 1>
          <div class="hydra-language">
            <div class="${properties.kcInputClass!}">
              <select
                aria-label="${msg("languages")}"
                id="login-select-toggle"
                onchange="if (this.value) window.location.href=this.value"
              >
                <#list locale.supported?sort_by("label") as l>
                  <option
                    value="${l.url}"
                    ${(l.languageTag == locale.currentLanguageTag)?then('selected','')}
                  >
                    ${l.label}
                  </option>
                </#list>
              </select>
              <span class="${properties.kcFormControlUtilClass}">
                <span class="${properties.kcFormControlToggleIcon!}">
                  <svg
                    class="pf-v5-svg"
                    viewBox="0 0 320 512"
                    fill="currentColor"
                    aria-hidden="true"
                    role="img"
                    width="1em"
                    height="1em"
                  >
                    <path
                      d="M31.3 192h257.3c17.8 0 26.7 21.5 14.1 34.1L174.1 354.8c-7.8 7.8-20.5 7.8-28.3 0L17.2 226.1C4.6 213.5 13.5 192 31.3 192z"
                    >
                    </path>
                  </svg>
                </span>
              </span>
            </div>
          </div>
          </#if>
        </div>

        <#if hydraSignIn>
          <p class="hydra-lede">${msg("hydraLede")}</p>
        </#if>

        <div class="hydra-body ${properties.kcLoginMainBody!}">
          <#if !(auth?has_content && auth.showUsername() && !auth.showResetCredentials())>
              <#if displayRequiredFields>
                  <div class="${properties.kcContentWrapperClass!}">
                      <div class="${properties.kcLabelWrapperClass!} subtitle">
                          <span class="${properties.kcInputHelperTextItemTextClass!}">
                            <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                          </span>
                      </div>
                  </div>
              </#if>
          <#else>
              <#if displayRequiredFields>
                  <div class="${properties.kcContentWrapperClass!}">
                      <div class="${properties.kcLabelWrapperClass!} subtitle">
                          <span class="${properties.kcInputHelperTextItemTextClass!}">
                            <span class="${properties.kcInputRequiredClass!}">*</span> ${msg("requiredFields")}
                          </span>
                      </div>
                      <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                          <#nested "show-username">
                          <@username />
                      </div>
                  </div>
              <#else>
                  <div class="${properties.kcFormClass} ${properties.kcContentWrapperClass}">
                    <#nested "show-username">
                    <@username />
                  </div>
              </#if>
          </#if>

          <#-- App-initiated actions should not see warning messages about the need to complete the action -->
          <#-- during login.                                                                               -->
          <#if displayMessage && message?has_content && (message.type != 'warning' || !isAppInitiatedAction??)>
              <div class="${properties.kcAlertClass!} pf-m-${(message.type = 'error')?then('danger', message.type)} hydra-alert" role="${(message.type = 'error' || message.type = 'warning')?then('alert', 'status')}">
                  <div class="${properties.kcAlertIconClass!}">
                      <#if message.type = 'success'><@hydraGlyph kind="healthy"/></#if>
                      <#if message.type = 'warning'><@hydraGlyph kind="warning"/></#if>
                      <#if message.type = 'error'><@hydraGlyph kind="problem"/></#if>
                      <#if message.type = 'info'><@hydraGlyph kind="unknown"/></#if>
                  </div>
                  <span class="${properties.kcAlertTitleClass!} kc-feedback-text">${message.summary}</span>
              </div>
          </#if>

          <#nested "form">

          <#if auth?has_content && auth.showTryAnotherWayLink()>
            <form id="kc-select-try-another-way-form" action="${url.loginAction}" method="post" novalidate="novalidate">
                <input type="hidden" name="tryAnotherWay" value="on"/>
                <a id="try-another-way" href="javascript:document.forms['kc-select-try-another-way-form'].requestSubmit()"
                    class="${properties.kcButtonSecondaryClass} ${properties.kcButtonBlockClass} ${properties.kcMarginTopClass}">
                      ${msg("doTryAnotherWay")}
                </a>
            </form>
          </#if>

            <div class="${properties.kcLoginMainFooter!}">
                <#nested "socialProviders">

                <#if displayInfo>
                    <div id="kc-info" class="${properties.kcLoginMainFooterBand!} ${properties.kcFormClass}">
                        <div id="kc-info-wrapper" class="${properties.kcLoginMainFooterBandItem!}">
                            <#nested "info">
                        </div>
                    </div>
                </#if>
            </div>
        </div>

        <#if hydraSignIn>
          <p class="hydra-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
            ${msg("hydraPasswordNote")}
          </p>
          <#if !realm.registrationAllowed>
            <p class="hydra-help">${msg("hydraNoAccount")}</p>
          </#if>
        </#if>

        <div class="${properties.kcLoginMainFooter!} hydra-footer">
            <@loginFooter.content/>
        </div>
      </div>
    </main>

    <#-- The picture from /signin: services orbiting Hydra on an inverse panel. Decorative, sample data. -->
    <aside class="hydra-visual" aria-hidden="true">
      <p class="hydra-visual-status"><@hydraGlyph kind="healthy"/>${msg("hydraVisualStatus")}</p>
      <div class="hydra-orbit">
        <div class="hydra-orbit-plane">
          <div class="hydra-orbit-spin">
            <span class="hydra-orbit-path"></span>
            <span class="hydra-orbit-path hydra-orbit-path-inner"></span>
            <#list ["web-frontend", "api-gateway", "order-service", "payment-service", "orders-db", "rabbitmq"] as service>
              <span class="hydra-orbit-node hydra-at-${service?index}">
                <span class="hydra-orbit-unspin">
                  <span class="hydra-orbit-face"><@hydraGlyph kind="healthy"/>${service}</span>
                </span>
              </span>
            </#list>
          </div>
          <span class="hydra-orbit-core">
            <svg viewBox="0 0 28 28" width="30" height="30" fill="none" aria-hidden="true" focusable="false">
              <path d="M14 20.5V15M14 15 8.6 9.6M14 15l5.4-5.4M14 15V8.6" stroke-width="1.7" stroke-linecap="round"/>
              <circle cx="14" cy="20.5" r="2.1"/>
              <circle cx="8.6" cy="8.8" r="1.9"/>
              <circle cx="14" cy="7.6" r="1.9"/>
              <circle cx="19.4" cy="8.8" r="1.9"/>
            </svg>
            Hydra
          </span>
        </div>
      </div>
      <div class="hydra-visual-caption">
        <p class="hydra-visual-title">${msg("hydraVisualTitle")}</p>
        <p class="hydra-visual-note">${msg("hydraVisualNote")}</p>
      </div>
    </aside>
  </div>
</div>
</body>
</html>
</#macro>

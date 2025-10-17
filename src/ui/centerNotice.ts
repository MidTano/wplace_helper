import { markElement } from '../wguard';

export function showCenterNotice(message: string, duration = 2200, imageUrl?: string, opts?: { delay?: number }): () => void {
  try {
    const delay = typeof opts?.delay === 'number' ? Math.max(0, opts.delay) : 0;
    const persistent = duration <= 0;
    const wrap = document.createElement('div');
    markElement(wrap);
    wrap.style.position = 'fixed';
    wrap.style.left = '0';
    wrap.style.top = '0';
    wrap.style.width = '100%';
    wrap.style.height = '100%';
    wrap.style.zIndex = '2147483647';
    wrap.style.display = 'flex';
    wrap.style.alignItems = 'center';
    wrap.style.justifyContent = 'center';
    wrap.style.pointerEvents = 'none';
    let style = document.getElementById('_w_notice_styles') as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement('style');
      style.id = '_w_notice_styles';
      markElement(style);
      style.textContent = `
@keyframes _w_spin { to { transform: rotate(360deg); } }
@keyframes _w_notice_icon {
  0% { opacity: 0; transform: scale(0.6) translateY(12px); }
  55% { transform: scale(1.1) translateY(-6px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}
@keyframes _w_notice_logo_bounce {
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-20px); }
  60% { transform: translateY(-10px); }
}
._w_notice_logo { width: 100%; height: 100%; transform: scale(2); transform-origin: center; }
._w_notice_logo path { fill: #fff; opacity: 1; transform-origin: center; animation: _w_notice_logo_bounce 1.5s ease-in-out infinite; }
._w_notice_logo path:nth-child(1) { animation-delay: 0s; }
._w_notice_logo path:nth-child(2) { animation-delay: 0.1s; }
._w_notice_logo path:nth-child(3) { animation-delay: 0.2s; }
._w_notice_logo path:nth-child(4) { animation-delay: 0.3s; }
._w_notice_logo path:nth-child(5) { animation-delay: 0.4s; }
`;
      document.head?.appendChild(style);
    }
    const lines = String(message ?? '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const titleLine = lines.shift() || 'WGuard';
    const subtitleLine = lines.shift() || '';
    const bodyLines = lines;
    const box = document.createElement('div');
    markElement(box);
    box.style.background = 'rgba(18,18,22,0.96)';
    box.style.color = '#fff';
    box.style.padding = '24px 26px 22px';
    box.style.borderRadius = '18px';
    box.style.border = '1px solid rgba(255,255,255,0.14)';
    box.style.boxShadow = '0 14px 34px rgba(0,0,0,0.5)';
    box.style.fontFamily = 'system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Noto Sans,Arial,sans-serif';
    box.style.fontSize = '14px';
    box.style.maxWidth = '520px';
    box.style.width = 'calc(100% - 48px)';
    box.style.textAlign = 'left';
    box.style.pointerEvents = 'auto';
    box.style.transform = 'translateY(12px) scale(0.94)';
    box.style.opacity = '0';
    box.style.transition = 'transform .2s cubic-bezier(0.18,0.89,0.32,1.28), opacity .2s ease';

    const header = document.createElement('div');
    markElement(header);
    header.style.display = 'flex';
    header.style.flexDirection = 'column';
    header.style.alignItems = 'center';
    header.style.textAlign = 'center';
    header.style.gap = '12px';
    header.style.marginBottom = '18px';

    const iconWrap = document.createElement('div');
    markElement(iconWrap);
    iconWrap.style.width = '64px';
    iconWrap.style.height = '64px';
    iconWrap.style.borderRadius = '16px';
    iconWrap.style.background = 'linear-gradient(135deg, var(--wph-primary, #f05123) 0%, var(--wph-primary-2, var(--wph-primary, #f05123)) 100%)';
    iconWrap.style.boxShadow = '0 10px 26px var(--wph-primaryGlow, rgba(240,81,35,0.35))';
    iconWrap.style.display = 'flex';
    iconWrap.style.alignItems = 'center';
    iconWrap.style.justifyContent = 'center';
    iconWrap.style.overflow = 'hidden';
    iconWrap.style.color = '#fff';
    iconWrap.style.transform = 'scale(0.85)';
    iconWrap.style.opacity = '0';
    iconWrap.style.animation = '_w_notice_icon 420ms cubic-bezier(0.68,-0.55,0.265,1.55) 120ms forwards';
    iconWrap.innerHTML = `
<svg class="_w_notice_logo" xmlns="http://www.w3.org/2000/svg" xml:space="preserve" viewBox="0 0 1024 1024">
  <path d="M461.343079 510.999939c.001129 4.832825.539154 9.247864-.108979 13.481323-1.351562 8.828003 4.084412 12.883362 10.452973 16.733093 1.665039-1.875549 1.006683-3.967834 1.012359-5.854675.048066-15.997864-.006408-31.996002-.012146-47.994079-.002319-6.418854 3.934906-11.226563 10.83606-13.252045 1.309875 1.586487.741272 3.491486.744354 5.244842.039124 22.330567.017243 44.661255.022919 66.991944.001923 7.623596 2.224396 10.686096 9.966949 13.55896 1.836884-2.022644 1.35614-4.59607 1.359192-6.986634.035553-27.830017.021851-55.660003.037812-83.49002.004058-7.114807 3.333129-11.370423 11.178131-13.953339v129.732727c-2.550568.664246-3.736359-1.294983-5.167633-2.510254-12.319611-10.460144-24.666565-20.890869-36.81781-31.544372-2.815857-2.46875-4.494324-2.606018-7.41565-.017212-14.95935 13.256164-30.134277 26.269775-45.288727 39.304382-1.976867 1.700317-3.818084 3.717896-7.329223 4.687256V427.696564c8.228149 3.405487 10.869537 7.542236 10.87384 15.277679.022675 40.824463.164551 81.648804.297058 122.473145.0047 1.436279-.282074 3.022216.943146 4.214966 7.490814-3.00232 9.806854-6.171509 9.808777-13.455201.009186-34.495849.003113-68.99176.03714-103.48761.001953-1.95523-.44513-3.993164.575744-5.8591 6.474152 1.374268 11.012818 6.733734 11.012909 13.041138.000458 28.496582-.024628 56.993194-.001373 85.489776.001434 1.773804-.494965 3.641602.522003 5.333924 7.99939-2.802613 10.929291-6.763733 10.931244-14.666626.0047-18.997681-.010956-37.995484.070343-56.99289.010315-2.405456-.561188-4.97998.948364-7.223083 7.266999 2.708069 10.499512 7.105072 10.500977 14.161499.001648 8.165253.005859 16.330536.009247 24.995758z"/>
  <path d="M381.650269 455.999939c-.007752-17.160217.082366-33.821411-.093598-50.479797-.042206-3.994538 1.092438-6.742676 4.262268-9.387909 24.296662-20.27591 48.421326-40.757874 72.621002-61.150238 1.342286-1.131073 2.476777-2.753601 4.645203-2.62143 1.705902 1.836334 1.033264 4.10492 1.035156 6.174011.019287 20.991669-.038879 41.983429-.053344 62.975159-.006409 9.304993-1.510621 11.742706-11.181183 16.725983v-61.661774c-4.529755.989441-6.701172 3.66507-9.152924 5.712219-15.851562 13.235657-31.554535 26.649445-47.419006 39.869446-2.291077 1.909149-3.207672 3.901215-3.205048 6.813202.062256 68.972961.068024 137.945984.046967 206.918945-.000855 2.795838.491516 5.058167 2.85083 7.016175 18.073273 14.998352 36.048462 30.114746 54.067169 45.178894.476868.398681 1.10144.620727 2.41687 1.341369v-46.295776c5.71756 1.129517 11.641876 6.781738 11.658569 11.123779.071534 18.658386-.008392 37.317444-.066589 55.976197-.002411.773864-.339447 1.546691-.505951 2.257507-2.267059.637329-3.280334-.960022-4.474884-1.95874-24.280823-20.2995-48.492859-40.68158-72.850372-60.888428-3.389313-2.811707-4.744873-5.767944-4.732269-10.202026.154663-54.311951.118316-108.624421.131134-163.436768zm194.31665 211.534424c17.781616-14.801026 35.274597-29.452881 52.852112-44.002564 2.797546-2.315674 3.969177-4.88092 3.964477-8.5755-.087158-68.307923-.061401-136.616059-.029419-204.924133.001282-2.74408-.194885-5.180787-2.56842-7.161103-18.033081-15.045349-35.998657-30.171692-53.999085-45.256225-.61145-.512421-1.369628-.849884-2.954345-1.812561v61.871887c-7.658386-2.101685-11.593628-7.056458-11.592407-13.845001.004089-22.158478.013122-44.316925.020141-66.475403.000488-1.63736.000061-3.274719.000061-4.755005 2.294068-.993195 3.210388.535736 4.251282 1.411011 24.987854 21.012725 49.93158 42.077911 74.932983 63.074401 2.506775 2.105195 3.51532 4.485962 3.512207 7.777955-.06781 71.973297-.059021 143.946716-.014526 215.920105.00177 2.838684-.62616 4.994079-2.958557 6.944397-25.677429 21.471008-51.266297 43.04779-76.894776 64.577392-.467285.392395-1.126098.556702-1.744812.850891-1.754577-1.816528-1.067627-3.912964-1.074401-5.784729-.058716-16.160461.57312-32.3526-.267212-48.46936-.45398-8.705261 4.109497-12.549256 10.226623-16.260193 2.362244 1.525513 1.546387 3.734375 1.559815 5.576355.089599 12.328125.01593 24.657715.148559 36.985107.01117 1.044007-1.653991 4.799805 2.6297 2.332276z"/>
  <path d="M541.047363 495.134521c-.00653-8.702972-2.377319-12.071929-10.140014-14.786468-1.282898 1.954285-.766114 4.168549-.769043 6.259491-.039185 28.155945-.019348 56.31189-.040039 84.467834-.005127 6.922242-3.655945 11.713746-11.082215 14.263245V455.61026c1.797241-.379395 2.708985 1.052734 3.780396 1.928741 8.123901 6.642395 16.031677 13.562012 24.348388 19.950531 4.458558 3.424866 6.160889 7.431397 5.872986 12.874024-.28125 5.31546.032349 10.659882-.044677 15.989685-.045899 3.176208 1.290588 4.441254 4.501953 4.388672 8.328003-.136353 16.662964-.200012 24.988159-.001618 3.843323.091614 5.085266-1.806274 5.044983-5.120727-.064759-5.326355-.325379-10.650665-.364868-15.976898-.066773-8.996094.391418-18.018128-.149964-26.982209-.512024-8.47821 4.441345-12.529754 11.513916-16.566558v132.429412c-6.697876-1.600219-10.941955-6.675842-10.932068-12.667114.02118-12.828491-.097046-25.658691.095765-38.484375.059387-3.952881-1.374268-5.30072-5.231812-5.218689-8.159546.173645-16.32843.150391-24.48822-.028503-3.694641-.081055-5.061768 1.423401-5.017273 5.004211.097412 7.828736-.008972 15.659912-.019654 23.490051-.011474 8.365235-2.649902 12.150269-11.867431 15.981202 0-23.926575 0-47.457093.000732-71.465577zm-41.817566-194.904602c1.172211-.932952 1.984467-1.900085 4.100251-.977661v92.638153c.244384.423432.4888.846894.733184 1.270325 5.988312-7.483581 11.808411-7.60791 17.441468.451904.277099-.439361.55426-.878753.83136-1.318145v-93.167298c7.379577 1.832032 11.886352 7.293885 11.888855 13.712067.012878 32.808258.017273 65.616486.002807 98.424744-.000732 1.628601.352722 3.337249-.671997 4.861053-2.050049.835815-3.039307-.883118-4.241821-1.861725-4.261719-3.468384-8.531067-6.93573-12.637451-10.583526-2.686768-2.38675-4.837555-2.730408-7.672577-.011658-3.83609 3.67868-8.113007 6.897156-12.193695 10.321564-1.252198 1.050781-2.41922 2.258697-4.187806 2.235076-1.503631-1.735412-.947998-3.643524-.949859-5.390411-.033325-31.309357.187042-62.621124-.174561-93.9263-.081878-7.08783 1.024994-12.740539 7.731842-16.678162zm34.990906 412.477295c.487671 8.073243-6.338196 9.779114-11.308594 15.081604v-80.015014c-4.442749 1.226379-6.397888 5.415954-9.849914 5.772217-3.635956.375366-5.360657-4.10553-9.664551-5.568665v78.385986c-8.34256-3.044311-11.766113-7.596496-11.766296-14.773254-.000733-27.326599.002746-54.653137.019989-81.979736.001037-1.640931.135406-3.281678.207611-4.920105 2.940582-.641785 4.149933 1.581298 5.734741 2.818725 3.805817 2.971497 7.541168 6.050598 11.117523 9.293091 2.789063 2.528748 5.017792 2.971252 7.997528.035583 3.785889-3.72998 8.06659-6.960266 12.161927-10.372436 1.239196-1.032532 2.290893-2.481018 5.3526-2.17395 0 29.254577 0 58.604187-.002564 88.415954zm87.099487-120.954589c-.09851 2.227294.2594 4.069519-.651611 5.737487-7.813415-2.734802-10.865906-6.71167-10.863647-13.972412.014465-46.967224.237487-93.936004-.13794-140.900055-.067138-8.394928 4.971741-11.410614 11.655884-15.974212 0 55.667572 0 110.157043-.002686 165.109192z"/>
  <path d="M573.087769 444.677246c-.123658 1.876343.284545 3.464386-1.078553 4.591095-1.612487.356384-2.42633-.886932-3.390442-1.700745-7.756103-6.546905-15.45288-13.164428-23.239379-19.674743-2.314026-1.934754-3.612854-4.072083-3.606263-7.236664.070008-33.782471.038452-67.565186.059265-101.347809.000794-1.271301-.342712-2.685516.842103-3.707275 7.499389 2.635376 10.657043 6.932831 10.655456 14.442749-.006103 28.124481.0625 56.249359-.092773 84.372986-.021546 3.906311 1.124267 6.584716 4.266662 8.857147 3.361084 2.430572 6.161255 5.682892 9.640442 7.892944 5.016296 3.186493 6.77887 7.440643 5.943482 13.510315zm-89.741028-88.677185c.005127 21.80545-.057434 43.111267.081451 64.415833.022675 3.480224-.976379 5.872436-3.718201 8.096527-7.49237 6.077667-14.732879 12.465362-22.100372 18.698059-1.106323.935943-2.122497 2.171661-3.834473 1.967346-2.792541-7.506653-2.015258-13.720429 4.417847-17.693878 11.800903-7.28888 14.660004-17.168091 14.014496-30.517273-1.11618-23.083069.096375-46.270355-.572388-69.387757-.250366-8.654083 4.53592-12.355041 11.71109-17.111297 0 14.375763 0 27.704101.00055 41.53244zm23.463623 247.137146c5.797485 4.840454 5.808044 4.853027 11.26947.278381 11.232117-9.408386 22.440002-18.845886 33.68103-28.243774 7.068421-5.909485 8.546509-5.6427 14.128479 2.593628-4.236389 4.624084-9.346435 8.35321-14.164062 12.398498-11.854859 9.954285-23.816651 19.78302-35.566712 29.859009-2.768615 2.374146-4.594604 2.126221-7.214355-.103821-15.3414-13.058899-30.813202-25.964294-46.209564-38.958862-1.6792-1.417236-4.551331-3.046509-1.469208-5.40686 2.494812-1.910584 4.274628-7.011963 8.911865-3.12793 12.126404 10.156738 24.245697 20.322083 36.633057 30.711731zM465.785919 456.75c14.421753-12.088623 28.644501-23.868164 42.6875-35.858246 2.920441-2.49353 4.892487-2.882568 8.019928-.216064 15.065674 12.845337 30.360413 25.421631 45.494568 38.187408 1.636292 1.380249 4.989258 2.483856 2.207581 5.796723-3.736878 4.450378-6.559693 5.251648-9.77472 2.573059-12.399536-10.330567-24.852172-20.59903-37.138305-31.062897-3.169434-2.699402-5.441437-3.161804-8.894654-.168182-11.057739 9.586151-22.477111 18.753753-33.67987 28.17453-6.975037 5.86557-7.821228 5.851348-14.433258-1.59787.868133-2.609192 3.475677-3.735474 5.51123-5.828461zM541.854004 664c-.028626-14.993286-.02301-29.486816-.106445-43.979736-.016175-2.801331.46051-5.177613 2.772827-7.105713 8.314087-6.932801 16.536377-13.975647 24.813598-20.952881.731873-.616882 1.46521-1.417969 2.624085-1.082703 2.865845 6.930908 1.80011 13.837097-4.039124 17.514832-11.542114 7.269653-15.994568 16.706604-14.93634 30.686645 1.37915 18.220764-.16394 36.644715.570251 54.940308.342835 8.543152-4.282226 12.130737-11.695739 16.483948 0-15.985962 0-30.995301-.003113-46.5047zm-58.512055-9.999878c-.000335 18.72699-.000335 36.954041-.000335 55.475464-8.424591-3.016724-11.601776-7.268372-11.602967-14.7453-.003692-22.818726-.076782-45.638001.080628-68.455689.027679-4.013916-.88266-7.035827-4.313782-9.352844-2.610443-1.762817-4.93164-3.957031-7.363251-5.981262-8.210968-6.835205-8.887756-8.776429-6.91629-19.708069 1.380524-.686707 2.172272.371704 3.021515 1.086975 8.023743 6.758728 15.990479 13.585876 24.063629 20.28479 2.254242 1.870483 3.11853 4.001526 3.086212 6.918091-.125518 11.324768-.053497 22.651672-.055359 34.477844z"/>
</svg>`;
    const textWrap = document.createElement('div');
    markElement(textWrap);
    textWrap.style.display = 'grid';
    textWrap.style.gap = '6px';
    textWrap.style.width = '100%';

    header.appendChild(iconWrap);
    if (titleLine) {
      const titleEl = document.createElement('div');
      markElement(titleEl);
      titleEl.textContent = titleLine;
      titleEl.style.fontSize = '22px';
      titleEl.style.fontWeight = '700';
      titleEl.style.letterSpacing = '-0.3px';
      titleEl.style.color = '#fff';
      textWrap.appendChild(titleEl);
    }
    if (subtitleLine) {
      const subEl = document.createElement('div');
      markElement(subEl);
      subEl.textContent = subtitleLine;
      subEl.style.fontSize = '15px';
      subEl.style.fontWeight = '600';
      subEl.style.color = 'rgba(255,255,255,0.92)';
      subEl.style.textShadow = '0 0 16px rgba(240,81,35,0.4)';
      textWrap.appendChild(subEl);
    }
    header.appendChild(textWrap);
    box.appendChild(header);

    const body = document.createElement('div');
    markElement(body);
    body.style.fontSize = '13.5px';
    body.style.lineHeight = '1.55';
    body.style.color = 'rgba(255,255,255,0.86)';
    body.style.display = 'grid';
    body.style.gap = '10px';
    body.style.whiteSpace = 'normal';
    body.style.wordBreak = 'break-word';

    const detailList = document.createElement('div');
    markElement(detailList);
    detailList.style.display = 'grid';
    detailList.style.gap = '6px';
    detailList.style.whiteSpace = 'normal';

    bodyLines.forEach((line, idx) => {
      const lineEl = document.createElement('div');
      markElement(lineEl);
      lineEl.style.color = 'rgba(255,255,255,0.82)';
      lineEl.style.textAlign = 'left';
      lineEl.style.fontSize = '13.5px';
      if (idx === 0) {
        lineEl.style.color = '#f87171';
        lineEl.style.fontWeight = '600';
      } else if (idx === 1) {
        lineEl.style.color = 'rgba(255,255,255,0.76)';
      }
      if (/^url\s*:/i.test(line)) {
        const urlValue = line.replace(/^url\s*:/i, '').trim();
        const label = document.createElement('span');
        markElement(label);
        label.textContent = 'URL:';
        label.style.opacity = '0.7';
        label.style.marginRight = '6px';
        const link = document.createElement('a');
        markElement(link);
        link.textContent = urlValue;
        link.href = urlValue;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.color = '#8ab4ff';
        link.style.textDecoration = 'underline';
        lineEl.appendChild(label);
        lineEl.appendChild(link);
      } else {
        lineEl.textContent = line;
      }
      detailList.appendChild(lineEl);
    });

    if (detailList.childElementCount > 0) {
      body.appendChild(detailList);
    }

    if (imageUrl) {
      const cont = document.createElement('div');
      markElement(cont);
      cont.style.display = 'grid';
      cont.style.gridTemplateColumns = 'minmax(0, 180px) minmax(0, 1fr)';
      cont.style.gap = '14px';
      cont.style.alignItems = 'center';
      const img = document.createElement('img');
      markElement(img);
      img.src = imageUrl;
      img.alt = 'preview';
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.maxHeight = '42vh';
      img.style.borderRadius = '10px';
      img.style.border = '1px solid rgba(255,255,255,0.12)';
      img.style.objectFit = 'contain';
      img.style.background = '#0f0f12';
      img.style.opacity = '0';
      img.style.transition = 'opacity .18s ease';
      img.onload = () => {
        try {
          img.style.opacity = '1';
        } catch {}
      };
      cont.appendChild(img);
      cont.appendChild(body);
      box.appendChild(cont);
    } else if (persistent) {
      const cont = document.createElement('div');
      markElement(cont);
      cont.style.display = 'grid';
      cont.style.gridTemplateColumns = 'auto 1fr';
      cont.style.gap = '10px';
      cont.style.alignItems = 'center';
      const spinner = document.createElement('div');
      markElement(spinner);
      spinner.style.width = '16px';
      spinner.style.height = '16px';
      spinner.style.border = '2px solid rgba(255,255,255,0.24)';
      spinner.style.borderTopColor = '#f05123';
      spinner.style.borderRightColor = '#f05123';
      spinner.style.borderRadius = '50%';
      spinner.style.animation = '_w_spin .9s linear infinite';
      const text = document.createElement('div');
      markElement(text);
      text.style.whiteSpace = 'pre-line';
      text.textContent = [subtitleLine, ...bodyLines].filter(Boolean).join('\n');
      cont.appendChild(spinner);
      cont.appendChild(text);
      box.appendChild(cont);
    } else {
      if (detailList.childElementCount > 0) {
        box.appendChild(body);
      }
    }
    const mount = () => {
      wrap.appendChild(box);
      document.body.appendChild(wrap);
      requestAnimationFrame(() => {
        try {
          box.style.transform = 'translateY(0) scale(1)';
          box.style.opacity = '1';
        } catch {}
      });
    };
    let removed = false;
    let timer: any = null;
    const close = () => {
      if (removed) return;
      removed = true;
      try {
        if (timer) clearTimeout(timer);
      } catch {}
      try {
        box.style.transform = 'translateY(6px) scale(0.98)';
        box.style.opacity = '0';
      } catch {}
      setTimeout(() => {
        try {
          wrap.remove();
        } catch {}
      }, 180);
    };
    const mountTimeout = delay > 0 ? setTimeout(mount, delay) : null;
    if (delay === 0) {
      mount();
    }
    if (duration > 0) {
      timer = setTimeout(close, Math.max(15000, duration) + delay);
    }
    return () => {
      if (mountTimeout) {
        clearTimeout(mountTimeout);
      }
      close();
    };
  } catch {
    return () => {};
  }
}

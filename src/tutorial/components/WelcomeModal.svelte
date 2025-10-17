<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { t } from '../../i18n';
  import { scaleIn, fadeIn, slideIn } from '../utils/animations';
  import TutorialCursorGuide from './TutorialCursorGuide.svelte';

  const dispatch = createEventDispatcher();
  
  let modalElement: HTMLDivElement;
  let contentElement: HTMLDivElement;
  let iconElement: HTMLDivElement;
  let titleElement: HTMLHeadingElement;
  let subtitleElement: HTMLParagraphElement;
  let descriptionElement: HTMLParagraphElement;
  let feature1: HTMLDivElement;
  let feature2: HTMLDivElement;
  let feature3: HTMLDivElement;
  let footerElement: HTMLDivElement;
  let startButton: HTMLButtonElement;
  let startButtonBounds: any = null;

  onMount(() => {
    if (modalElement) fadeIn(modalElement, { duration: 300 });
    if (contentElement) {
      setTimeout(() => {
        scaleIn(contentElement, { duration: 400 });
      }, 100);
    }
    
    if (iconElement) {
      setTimeout(() => scaleIn(iconElement, { duration: 500 }), 300);
    }
    if (titleElement) {
      setTimeout(() => fadeIn(titleElement, { duration: 400 }), 450);
    }
    if (subtitleElement) {
      setTimeout(() => fadeIn(subtitleElement, { duration: 400 }), 550);
    }
    if (descriptionElement) {
      setTimeout(() => slideIn(descriptionElement, 'top', { duration: 400 }), 650);
    }
    if (feature1) {
      setTimeout(() => slideIn(feature1, 'left', { duration: 400 }), 750);
    }
    if (feature2) {
      setTimeout(() => slideIn(feature2, 'left', { duration: 400 }), 850);
    }
    if (feature3) {
      setTimeout(() => slideIn(feature3, 'left', { duration: 400 }), 950);
    }
    if (footerElement) {
      setTimeout(() => fadeIn(footerElement, { duration: 400 }), 1050);
    }
    
    setTimeout(() => {
      updateStartButtonBounds();
    }, 1100);
  });

  function updateStartButtonBounds() {
    if (startButton) {
      const rect = startButton.getBoundingClientRect();
      startButtonBounds = {
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height
      };
    }
  }

  function handleStart() {
    dispatch('start');
  }

  function handleSkip() {
    dispatch('skip');
  }
</script>

<div class="tutorial-welcome-backdrop" bind:this={modalElement}>
  <div class="tutorial-welcome-modal" bind:this={contentElement}>
    <div class="welcome-header">
      <div class="welcome-icon" bind:this={iconElement} style="opacity: 0;">
        <svg class="elastic-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" preserveAspectRatio="none">
          <path d="M461 511v13c-1 9 4 13 11 17l1-6v-48c0-6 4-11 11-13v72c0 8 3 11 10 14 2-2 2-5 2-7v-84c0-7 3-11 11-14v130c-3 1-4-1-5-2l-37-32c-3-2-5-2-8 0l-45 39-7 5V428c8 3 11 7 11 15v122l1 5c7-3 10-7 10-14V447c7 1 11 7 11 13v85l1 6c8-3 11-7 11-15v-57c0-2-1-5 1-7 7 3 10 7 10 14v25z"/>
          <path d="M382 456v-50c0-4 1-7 4-10l72-61c2-1 3-3 5-3 2 2 1 4 1 7v63c0 9-1 11-11 16v-61c-5 1-7 3-9 5l-48 40c-2 2-3 4-3 7v207c0 3 1 5 3 7l54 45 2 1v-46c6 1 12 7 12 11v58c-3 1-4 0-5-1l-73-61c-3-3-4-6-4-11V456zm194 212 53-44c3-3 4-5 4-9V410c0-3 0-5-3-7l-54-45-3-2v62c-7-2-11-7-11-14v-71c2-1 3 0 4 1l75 63c2 2 3 5 3 8v216c0 3 0 5-3 7l-77 64-1 1c-2-2-1-4-1-6l-1-48c0-9 5-13 11-16 2 1 1 3 1 5v37c0 1-1 5 3 3z"/>
          <path d="M541 495c0-9-2-12-10-15l-1 7v84c0 7-4 12-11 14V456c2-1 3 1 4 2l24 19c5 4 6 8 6 13v16c0 4 1 5 4 5h25c4 0 6-2 6-5l-1-16v-27c-1-9 4-13 12-17v133c-7-2-11-7-11-13v-39c0-4-2-5-6-5h-24c-4 0-5 2-5 5v24c0 8-3 12-12 16v-72zm-42-195c1-1 2-2 4-1v93l1 1c6-7 12-7 18 1v-95c8 2 12 7 12 14v103c-2 1-3-1-5-2l-12-10c-3-3-5-3-8 0l-12 10-4 2c-2-2-1-3-1-5l-1-94c0-7 2-13 8-17zm35 413c1 8-6 9-11 15v-80c-5 1-6 5-10 6-4 0-5-5-10-6v78c-8-3-11-7-11-14v-87c3-1 4 1 6 3l11 9c3 2 5 3 8 0l12-11c1-1 2-2 5-2v89zm87-121v5c-8-2-11-6-11-13V443c0-9 5-12 11-16v165z"/>
          <path d="m573 445-1 4c-2 1-2-1-3-1l-24-20c-2-2-3-4-3-7V319c0-1-1-2 1-3 7 2 10 7 10 14v84c0 4 1 7 5 9l9 8c5 3 7 8 6 14zm-90-89v64c0 4-1 6-3 9l-22 18-4 2c-3-7-2-14 4-18 12-7 15-17 14-30v-69c-1-9 4-13 11-18v42zm24 247c6 5 6 5 11 0l34-28c7-6 8-5 14 3l-14 12-36 30c-3 2-4 2-7 0l-46-39c-2-1-5-3-2-5s5-7 9-4l37 31zm-41-146 42-36c3-3 5-3 8 0l46 38c2 1 5 2 2 6-4 4-6 5-10 2l-37-31c-3-3-5-3-9 0l-33 28c-7 6-8 6-15-1 1-3 4-4 6-6zm76 207v-44c0-3 0-5 3-7l24-21 3-1c3 7 2 14-4 17-12 8-16 17-15 31l1 55c0 9-5 12-12 17v-47zm-59-10v55c-8-3-11-7-11-14v-69c0-4-1-7-4-9l-8-6c-8-7-9-9-7-20l3 1 24 21c3 1 3 4 3 7v34z"/>
        </svg>
      </div>
      <h1 class="welcome-title" bind:this={titleElement} style="opacity: 0;">
        <span>{t('tutorial.welcome.title')}</span>
        <span>Wplace Helper</span>
      </h1>
      <p class="welcome-subtitle" bind:this={subtitleElement} style="opacity: 0;">{t('tutorial.welcome.subtitle')}</p>
    </div>

    <div class="welcome-body">
      <p class="welcome-description" bind:this={descriptionElement} style="opacity: 0;">{t('tutorial.welcome.description')}</p>
      
      <div class="welcome-features">
        <div class="feature-item" bind:this={feature1} style="opacity: 0;">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19,14a3,3,0,1,0-3-3A3,3,0,0,0,19,14Zm0-4a1,1,0,1,1-1,1A1,1,0,0,1,19,10Z"/>
              <path d="M26,4H6A2,2,0,0,0,4,6V26a2,2,0,0,0,2,2H26a2,2,0,0,0,2-2V6A2,2,0,0,0,26,4Zm0,22H6V20l5-5,5.59,5.59a2,2,0,0,0,2.82,0L21,19l5,5Zm0-4.83-3.59-3.59a2,2,0,0,0-2.82,0L18,19.17l-5.59-5.59a2,2,0,0,0-2.82,0L6,17.17V6H26Z"/>
            </svg>
          </div>
          <div class="feature-text">
            <h3>{t('tutorial.welcome.feature1.title')}</h3>
            <p>{t('tutorial.welcome.feature1.description')}</p>
          </div>
        </div>

        <div class="feature-item" bind:this={feature2} style="opacity: 0;">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M21.71 20.29L18 16.61A9 9 0 1 0 16.61 18l3.68 3.68a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.39zM11 18a7 7 0 1 1 7-7 7 7 0 0 1-7 7z"/>
            </svg>
          </div>
          <div class="feature-text">
            <h3>{t('tutorial.welcome.feature2.title')}</h3>
            <p>{t('tutorial.welcome.feature2.description')}</p>
          </div>
        </div>

        <div class="feature-item" bind:this={feature3} style="opacity: 0;">
          <div class="feature-icon">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <div class="feature-text">
            <h3>{t('tutorial.welcome.feature3.title')}</h3>
            <p>{t('tutorial.welcome.feature3.description')}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="welcome-footer" bind:this={footerElement} style="opacity: 0;">
      <button type="button" class="editor-btn welcome-skip" on:click={handleSkip}>
        {t('tutorial.welcome.btnSkip')}
      </button>
      <button type="button" class="editor-btn editor-primary welcome-start" on:click={handleStart} bind:this={startButton}>
        {t('tutorial.welcome.btnStart')}
      </button>
    </div>
  </div>

  <TutorialCursorGuide 
    targetBounds={startButtonBounds}
    isActive={true}
  />
</div>

<style>
  .tutorial-welcome-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(10px);
    z-index: 2000003;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .tutorial-welcome-modal {
    background: rgba(10, 10, 10, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 24px;
    max-width: 560px;
    width: 100%;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    overflow: hidden;
  }

  .welcome-header {
    padding: 40px 40px 24px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: linear-gradient(180deg, var(--wph-primaryGlow, rgba(240, 81, 35, 0.1)) 0%, transparent 100%);
  }

  .welcome-icon {
    width: 120px;
    height: 120px;
    margin: 0 auto 20px;
    background: linear-gradient(135deg, var(--wph-primary, #f05123) 0%, var(--wph-primary-2, #ff6b3d) 100%);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    color: white;
    box-shadow: 0 8px 24px var(--wph-primaryGlow, rgba(240, 81, 35, 0.4));
  }

  .elastic-logo {
    width: 100%;
    height: 100%;
    transform: scale(2);
    transform-origin: center;
  }

  .elastic-logo path {
    fill: #fff;
    opacity: 0;
    transform-origin: center;
    animation: elasticLogo 0.9s cubic-bezier(0.68,-0.55,0.265,1.55) forwards;
  }

  .elastic-logo path:nth-child(1) { animation-delay: 0.1s; }
  .elastic-logo path:nth-child(2) { animation-delay: 0.2s; }
  .elastic-logo path:nth-child(3) { animation-delay: 0.3s; }
  .elastic-logo path:nth-child(4) { animation-delay: 0.4s; }
  .elastic-logo path:nth-child(5) { animation-delay: 0.5s; }

  @keyframes elasticLogo {
    0% { opacity: 0; transform: scale(0.2); }
    60% { transform: scale(1.15); }
    100% { opacity: 1; transform: scale(1); }
  }

  .welcome-title {
    font-size: 34px;
    font-weight: 700;
    color: #fff;
    margin: 0 0 8px;
    letter-spacing: -0.5px;
    line-height: 1.1;
    display: inline-flex;
    flex-direction: column;
    gap: 6px;
  }

  .welcome-subtitle {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
  }

  .welcome-body {
    padding: 32px 40px;
  }

  .welcome-description {
    font-size: 15px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 24px;
  }

  .welcome-features {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .feature-item {
    display: flex;
    gap: 16px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .feature-item:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--wph-primaryGlow, rgba(240, 81, 35, 0.3));
    transform: translateY(-2px);
  }

  .feature-icon {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--wph-primaryGlow, rgba(240, 81, 35, 0.2)) 0%, var(--wph-primaryGlow, rgba(240, 81, 35, 0.1)) 100%);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--wph-primary, #f05123);
  }

  .feature-text h3 {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 4px;
  }

  .feature-text p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.6);
    margin: 0;
    line-height: 1.5;
  }

  .welcome-footer {
    padding: 24px 40px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .editor-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    height: 40px;
    padding: 0 22px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.22);
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.95);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background .18s ease, border-color .18s ease;
  }

  .editor-btn:hover {
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.3);
  }

  .editor-btn:active {
    background: rgba(255,255,255,0.1);
  }

  .editor-btn.editor-primary {
    background: var(--wph-primary, #f05123);
    border-color: var(--wph-primary, #f05123);
    color: #fff;
  }

  .editor-btn.editor-primary:hover {
    background: var(--wph-primary, #f05123);
    border-color: var(--wph-primary, #f05123);
  }

  .welcome-skip {
    margin-right: auto;
  }

  @media (max-width: 640px) {
    .tutorial-welcome-modal {
      max-width: 100%;
      border-radius: 16px;
    }

    .welcome-header,
    .welcome-body,
    .welcome-footer {
      padding-left: 24px;
      padding-right: 24px;
    }

    .welcome-title {
      font-size: 24px;
    }

    .feature-item {
      flex-direction: column;
      text-align: center;
      align-items: center;
    }
  }
</style>

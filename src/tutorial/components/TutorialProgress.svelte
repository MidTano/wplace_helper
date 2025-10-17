<script lang="ts">
  import { t } from '../../i18n';

  export let currentStep: number = 0;
  export let totalSteps: number = 1;
  export let currentModuleName: string = '';

  $: progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;
</script>

<div class="tutorial-progress-bar">
  <div class="progress-info">
    <span class="module-name">{currentModuleName ? t(currentModuleName) : ''}</span>
    <span class="step-count">{currentStep}/{totalSteps}</span>
  </div>
  <div class="progress-track">
    <div class="progress-fill" style="width: {progress}%"></div>
  </div>
</div>

<style>
  .tutorial-progress-bar {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000002;
    background: rgba(20, 22, 28, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 12px 20px;
    min-width: 280px;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    font-size: 13px;
  }

  .module-name {
    color: rgba(255, 255, 255, 0.7);
    font-weight: 600;
  }

  .step-count {
    color: rgba(255, 255, 255, 0.5);
    font-weight: 500;
  }

  .progress-track {
    height: 6px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--wph-primary, #f05123) 0%, var(--wph-primary-2, #ff6b3d) 100%);
    border-radius: 3px;
    transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 0 8px var(--wph-primaryGlow, rgba(240, 81, 35, 0.5));
  }

  @media (max-width: 480px) {
    .tutorial-progress-bar {
      left: 16px;
      right: 16px;
      transform: none;
      min-width: auto;
    }
  }
</style>

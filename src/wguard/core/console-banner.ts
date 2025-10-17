const BANNER = `
 █████   ███   █████   █████████ 
▒▒███   ▒███  ▒▒███   ███▒▒▒▒▒███
 ▒███   ▒███   ▒███  ███     ▒▒▒ 
 ▒███   ▒███   ▒███ ▒███         
 ▒▒███  █████  ███  ▒███    █████
  ▒▒▒█████▒█████▒   ▒▒███  ▒▒███ 
    ▒▒███ ▒▒███      ▒▒█████████ 
     ▒▒▒   ▒▒▒        ▒▒▒▒▒▒▒▒▒  
                                 
                                 
PROTECTION SYSTEM
`;

interface BannerConfig {
  version: string;
  fingerprint: string;
  entropy: string;
  patterns: {
    attributes: string[];
    selectors: string[];
    functions: string[];
  };
  obfuscation: {
    channelSource: string;
    dataAttribute: string;
  };
  timing: {
    jitterRange: number;
  };
  timestamp: number;
}

export function printConsoleBanner(config: BannerConfig): void {
  try {
    const styles = {
      banner: 'color: #00ff9f; font-weight: bold; font-size: 14px; text-shadow: 0 0 5px #00ff9f;',
      title: 'color: #00ff9f; font-weight: bold; font-size: 12px;',
      subtitle: 'color: #00d4ff; font-weight: bold;',
      label: 'color: #888; font-weight: normal;',
      value: 'color: #fff; font-weight: bold;',
      success: 'color: #00ff9f; font-weight: bold;',
      pattern: 'color: #ffa500; font-style: italic;'
    };

    console.log('%c' + BANNER, styles.banner);
    
    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'color: #00ff9f;'
    );

    console.log(
      '%c[SYSTEM]%c INITIALIZED %c✓',
      styles.subtitle,
      styles.label,
      styles.success
    );

    console.log(
      '%c[VERSION]%c %s',
      styles.subtitle,
      styles.value,
      config.version
    );

    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'color: #00d4ff;'
    );

    console.log('%c USER IDENTITY', styles.title);
    console.log(
      '%c  Fingerprint:%c %s',
      styles.label,
      styles.value,
      config.fingerprint
    );
    console.log(
      '%c  Entropy:%c     %s',
      styles.label,
      styles.value,
      config.entropy
    );

    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'color: #00d4ff;'
    );

    console.log('%c OBFUSCATION LAYER', styles.title);
    console.log(
      '%c  Channel:%c      %s',
      styles.label,
      styles.value,
      config.obfuscation.channelSource
    );
    console.log(
      '%c  Data Attr:%c    %s',
      styles.label,
      styles.value,
      config.obfuscation.dataAttribute
    );
    console.log(
      '%c  Jitter:%c       %sms',
      styles.label,
      styles.value,
      config.timing.jitterRange
    );

    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'color: #00d4ff;'
    );

    console.log('%c POLYMORPHIC PATTERNS', styles.title);
    
    console.log('%c  Attributes:', styles.label);
    config.patterns.attributes.forEach((p, i) => {
      console.log(`%c    [${i}]%c ${p}`, styles.label, styles.pattern);
    });

    console.log('%c  Selectors:', styles.label);
    config.patterns.selectors.forEach((p, i) => {
      console.log(`%c    [${i}]%c ${p}`, styles.label, styles.pattern);
    });

    console.log('%c  Functions:', styles.label);
    config.patterns.functions.forEach((p, i) => {
      console.log(`%c    [${i}]%c ${p}`, styles.label, styles.pattern);
    });

    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'color: #00ff9f;'
    );

    const nextRotation = new Date(config.timestamp + 60 * 60 * 1000);
    console.log(
      '%c Next rotation:%c %s',
      styles.label,
      styles.value,
      nextRotation.toLocaleTimeString()
    );

    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'color: #00ff9f;'
    );

    console.log(
      '%c[STATUS]%c ALL SYSTEMS OPERATIONAL %c✓',
      styles.subtitle,
      styles.label,
      styles.success
    );

    console.log(
      '%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n',
      'color: #00ff9f;'
    );
  } catch {}
}

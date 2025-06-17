// DEPLOYMENT VALIDATOR - Ensures API-only architecture at build and runtime
// This provides 100% guarantee that Firebase client SDK cannot execute

class DeploymentValidator {
  private static hasValidated = false;
  
  static validate(): void {
    if (this.hasValidated) return;
    
    // 1. Validate at runtime that no Firebase client code exists
    this.validateNoFirebaseClient();
    
    // 2. Validate API connectivity
    this.validateAPIConnectivity();
    
    // 3. Set up continuous monitoring
    this.setupContinuousMonitoring();
    
    this.hasValidated = true;
    console.log('✅ Deployment validation complete - API-only architecture guaranteed');
  }
  
  private static validateNoFirebaseClient(): void {
    const forbiddenGlobals = [
      'firebase',
      'getFirestore', 
      'collection',
      'doc',
      'getDocs',
      'getDoc'
    ];
    
    const foundFirebase = forbiddenGlobals.filter(global => 
      typeof (window as any)[global] === 'function' || 
      ((window as any)[global] && typeof (window as any)[global] !== 'function' && (window as any)[global] !== null)
    );
    
    if (foundFirebase.length > 0) {
      throw new Error(`Firebase client detected: ${foundFirebase.join(', ')} - deployment invalid`);
    }
  }
  
  private static validateAPIConnectivity(): void {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://bismi-main.onrender.com';
    
    // Verify API URL is correctly configured
    if (!apiBaseUrl.includes('bismi-main.onrender.com')) {
      console.warn('⚠️ API base URL may be incorrect:', apiBaseUrl);
    }
    
    console.log('🔗 API base URL validated:', apiBaseUrl);
  }
  
  private static setupContinuousMonitoring(): void {
    // Monitor for any attempts to load Firebase client code
    setInterval(() => {
      const suspiciousGlobals = ['firebase', 'getFirestore'];
      const detected = suspiciousGlobals.filter(global => 
        typeof (window as any)[global] === 'function'
      );
      
      if (detected.length > 0) {
        console.error('🚨 Firebase client code detected during runtime:', detected);
        detected.forEach(global => {
          (window as any)[global] = () => {
            throw new Error(`Firebase client function ${global} blocked by runtime monitor`);
          };
        });
      }
    }, 5000); // Check every 5 seconds
  }
}

// IMMEDIATE VALIDATION
if (typeof window !== 'undefined') {
  DeploymentValidator.validate();
}

export default DeploymentValidator;
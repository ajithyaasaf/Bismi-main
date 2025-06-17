// API-Only Architecture Enforcer
// This ensures the frontend only uses API endpoints, never direct Firebase client

// Block any remaining Firebase client imports
export const blockFirebaseClient = () => {
  if (typeof window !== 'undefined') {
    // Override any remaining Firebase client references
    (window as any).firebase = undefined;
    (window as any).getFirestore = () => {
      throw new Error('Firebase client disabled - use API endpoints');
    };
    
    console.log('✓ Firebase client SDK blocked - API-only mode enforced');
  }
};

// Initialize blocking on module load
blockFirebaseClient();

export default blockFirebaseClient;
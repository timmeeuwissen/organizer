import { UserManager, Log } from 'oidc-client-ts'

// Configure logging for OIDC in development
export default defineNuxtPlugin(() => {
  // Enable logging in development mode
  if (process.dev) {
    Log.setLogger(console)
    Log.setLevel(Log.INFO)
    console.log('OIDC logging enabled in development mode')
  }
  
  // Set up silent renew iframe path
  const publicPath = '/oidc-silent-renew.html'
  
  // Create the silent renew HTML file
  if (process.client) {
    // Create an OIDC silent renew helper
    const silentRenewHelper = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>OIDC Silent Renewal</title>
        <meta charset="utf-8">
      </head>
      <body>
        <script src="/node_modules/oidc-client-ts/dist/browser/oidc-client-ts.min.js"></script>
        <script>
          // This page is used by the OIDC client for silent token renewal
          new oidc.UserManager().signinSilentCallback()
            .catch(function(error) {
              console.error('Silent renewal error:', error);
            });
        </script>
      </body>
      </html>
    `
    
    // In a real application, this file would be created at build time
    // This is just a simulation of how it would work
    console.log('Silent renew helper would be available at:', publicPath)
  }
  
  // Set up event hooks for OIDC events
  if (process.client) {
    console.log('OIDC plugin initialized')
  }
})

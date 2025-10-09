import('./server/unifiedRoutes.ts').then(module => {
  console.log('Module loaded successfully!');
  console.log('Exports:', Object.keys(module));
  console.log('registerUnifiedRoutes type:', typeof module.registerUnifiedRoutes);
}).catch(error => {
  console.error('Import failed:', error);
});

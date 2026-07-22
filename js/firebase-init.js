// Firebase initialization — loaded before all other scripts
// Scripts above are blocking — firebase is guaranteed available here
(function() {
  var cfg = {
    apiKey:            "AIzaSyC0nlYRrsbHtXoGX69iG0h0_Y2jHqXhdfM",
    authDomain:        "mydesk-ad0da.firebaseapp.com",
    databaseURL:       "https://mydesk-ad0da-default-rtdb.firebaseio.com",
    projectId:         "mydesk-ad0da",
    storageBucket:     "mydesk-ad0da.firebasestorage.app",
    messagingSenderId: "1097411875265",
    appId:             "1:1097411875265:web:d371d0671f568aaea4df40"
  };
  if (!firebase.apps.length) firebase.initializeApp(cfg);
  window._fbApp     = firebase.app();
  window._fbDB      = firebase.database();
  window._fbAuth    = firebase.auth();
  window._fbAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(){});
  window._fbInitDone = true;
})();

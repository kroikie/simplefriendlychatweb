//Retrieve the container for all of the posts
var posts = document.querySelector('#posts');
//Get the template for a post
var template =  document.querySelector('#postTemplate');

//Make a copy of the post template and populate it with data
function createPostNode(postId, post){
  var clone = template.content.cloneNode(true);
  var postUsername =  clone.querySelector('.post-username');
  postUsername.innerHTML = post.author;
  var postImage = clone.querySelector('.post-image');
  postImage.src = post.image_url;
  var detailsLink = clone.querySelector('a');
  detailsLink.href = "details.html?image=" + postId;
  return clone;
}

//Listen for the changes in the user authentication state
firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
		// User is signed in.
    //console.log(user)
    var isAnonymous = user.isAnonymous;
    var uid = user.uid;
		
    //Get a referencs to the posts in the database
		var postsRef = firebase.database().ref('posts');
    posts.innerHTML = "";
    //Get the data each time a child is added to the database for this reference
    postsRef.on('child_added', function(snapshot){
      //console.log(snapshot.val());
      var key = snapshot.key;
      var post = snapshot.val();
      posts.appendChild(createPostNode(key, post));
    });

    if(!isAnonymous){
      //Enable Sign out
      var signOut = document.querySelector('#sign-out');
      signOut.classList.remove('hidden');
      signOut.addEventListener('click', function(event){
        firebase.auth().signOut().then(function(){
          signOut.classList.add('hidden');
          console.log('Signed Out');
        }, function(error){
          console.log('Sign Out Error', error);
        });
      });
    }
	} else {
		console.log('Not logged in');
    //Sign in user since the authentication is required to access database
		firebase.auth().signInAnonymously().catch(function(error){
			console.log(error);
		});
	}
});

//Get the file input and listen for changes which signals that the user has submitted 
var fileInput = document.querySelector('#file-input');
fileInput.onchange = function(event){
  var user = firebase.auth().currentUser;

  // Obtain the file from the input field
  var files = fileInput.files;
  if(files.length == 0) return;
  var file = files[0];
  
  //Validate that the files is an image
  if(!file.type.startsWith('image')) return;
  // Create the file metadata object
  var metadata = {
      contentType: file.type,
  };
  
  // Get a reference to a location to upload the file
  var timestamp = new Date().getTime();
  var fileNameParts = file.name.split('.');
  var extension = fileNameParts[fileNameParts.length - 1];
  var storageRef = firebase.storage().ref(user.uid + '/timestamp.' + extension);
  
  // Start the file upload
  var uploadTask = storageRef.put(file, metadata);
  // Register three observers:
  // 1. 'state_changed' observer, called any time the state changes
  // 2. Error observer, called on failure
  // 3. Completion observer, called on successful completion
  uploadTask.on('state_changed', function(snapshot){
    // Observe state change events such as progress, pause, and resume
    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
    var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    console.log('Upload is ' + progress + '% done');
    switch (snapshot.state) {
      case firebase.storage.TaskState.PAUSED: // or 'paused'
        console.log('Upload is paused');
        break;
      case firebase.storage.TaskState.RUNNING: // or 'running'
        console.log('Upload is running');
        break;
      }
    }, function(error) {
      // Handle unsuccessful uploads
      console.log(error);
    }, function() {
      // Handle successful uploads on complete
      // For instance, get the download URL: https://firebasestorage.googleapis.com/...
      var downloadURL = uploadTask.snapshot.downloadURL;
      //Get reference to the posts in database
      var postsRef = firebase.database().ref('posts');
      //Create a new post in the database
      postsRef.push({
        author: user.displayName,
        userId: user.uid,
        image_url: downloadURL,
        timePosted: new Date().getTime()
      });
  });
};

//Show a dialog to the user to sign in
function promptForSignIn(){
  var dialog = document.querySelector('#sign-up-dialog');
  if (!dialog.showModal) {
    //Dialog is not supported in the browser so polyfill it
    dialogPolyfill.registerDialog(dialog);
  }
  var signIn = dialog.querySelector('.signin');
  signIn.addEventListener('click', function(event){
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(function(result) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      // The signed in user info.
      var googleUser = result.user;
      //Get the reference for this user in the database
      var userRef = firebase.database().ref('users').child(uid);
      userRef.once('value', function(snapshot){
        var data = snapshot.val();
        if(data === null){
          //New User. Add them to the database
          userRef.set({
            uid: googleUser.uid,
            name: googleUser.displayName,
            photo: googleUser.photoURL,
            email: googleUser.email
          });
        }
      });
    }).catch(function(error) {
      // Handle Errors here.
      var errorCode = error.code;
      var errorMessage = error.message;
      // The email of the user's account used.
      var email = error.email;
      // The firebase.auth.AuthCredential type that was used.
      var credential = error.credential;
      console.log(error);
    });
    dialog.close();
  });
  dialog.querySelector('.close').addEventListener('click', function(event) {
    dialog.close();
  });
  dialog.showModal();
}

//Post a new image
function postImage(){
  var user = firebase.auth().currentUser;
  if(!user) return;
  if(user.isAnonymous) {
    //User is anonymous so get them to sign in using Google
    promptForSignIn();
    return;
  }
  fileInput.click();
}
var pageContent = document.querySelector(".mdl-layout__content");
var template =  document.querySelector("#postTemplate");

function createPostNode(postId, post){
  var clone = document.importNode(template.content, true);
  var postUsername =  clone.querySelector('.post-username');
  postUsername.innerHTML = post.author;
  var postImage = clone.querySelector('.post-image');
  postImage.src = post.image_url;
  var detailsLink = clone.querySelector('a');
  detailsLink.href = "details.html?image=" + postId;
  return clone;
}

firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
		// User is signed in.
    console.log(user)
    var isAnonymous = user.isAnonymous;
    var uid = user.uid;
    //console.log(user);
		
    //Get a list of the posts
		var postsRef = firebase.database().ref('posts');
    pageContent.innerHTML = "";
    postsRef.on('child_added', function(snapshot){
      //console.log(snapshot.val());
      var key = snapshot.key;
      var post = snapshot.val();
      pageContent.appendChild(createPostNode(key, post));
    });
	} else {
		console.log("Not logged in");
		firebase.auth().signInAnonymously().catch(function(error){
			console.log(error);
		});
	}
});

var fileInput = document.querySelector("#file-input");
fileInput.onchange = function(event){
  var user = firebase.auth().currentUser;

  // Obtain the file from the input field
  var files = fileInput.files;
  if(files.length == 0) return;
  var file = files[0];
  
  //Validate that the files is an image
  if(!file.type.startsWith('image')) return;
  // Create the file metadata
  var metadata = {
      contentType: file.type,
  };
  
  // Get a reference to a location to upload the file
  var storageRef = firebase.storage().ref(user.uid + '/image.png');
  
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
      var postsRef = firebase.database().ref('posts');
      postsRef.push({
        author: user.displayName,
        userId: user.uid,
        image_url: downloadURL,
        timePosted: new Date().getTime()
      });
  });
};


function promptForSignIn(){
  var dialog = document.querySelector('#sign-up-dialog');
  if (!dialog.showModal) {
    dialogPolyfill.registerDialog(dialog);
  }
  dialog.querySelector('.signin').addEventListener('click', function(event){
    var provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).then(function(result) {
      // This gives you a Google Access Token. You can use it to access the Google API.
      var token = result.credential.accessToken;
      // The signed-in user info.
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

function postImage(){
  var user = firebase.auth().currentUser;
  if(!user) return;
  if(user.isAnonymous) {
    promptForSignIn();
    return;
  }
  fileInput.click();
}
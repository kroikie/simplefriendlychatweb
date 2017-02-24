var commentSection = document.querySelector("#comments");
var template = document.querySelector("#commentTemplate");

//Make a copy of the comment template and populate it with data
function createCommentNode(comment){
  //var clone = document.importNode(template.content, true); //Faster in Firefox
  var clone = template.content.cloneNode(true); //Faster in Chrome
  var commentUsername =  clone.querySelector('.comment-username');
  commentUsername.innerHTML = comment.author;
  var commentContent = clone.querySelector('.comment-content');
  commentContent.innerHTML = comment.text;
  return clone;
}

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

//Set up the page for a user
function userLoggedIn(user){
  //Get the id for the file from the url
  var queryString = window.location.search.substr(1);
  var queryParts = queryString.split('=');
  var postId = queryParts[1];

  //Get a database reference to the post
  var postRef = firebase.database().ref('posts').child(postId);
  //Retrieve the value from the reference
  postRef.once('value', function(snapshot){
    var post = snapshot.val();
    var postHTML = document.querySelector('#post')
    var postUsername = postHTML.querySelector('#post-username');
    postUsername.innerHTML = post.author;
    var postImage = postHTML.querySelector('#post-image');
    postImage.src = post.image_url;
    var postLike = postHTML.querySelector('#post-like');
    var postUnlike = postHTML.querySelector('#post-unlike');
    var postLikeRef = firebase.database().ref('likes').child(postId).child(user.uid);
    postLikeRef.on('value', function(snapshot){
      var liked = snapshot.val();
      //The user hasn't liked or they have disliked
      if(liked === null || !liked) {
        postLike.classList.remove('hidden');
        postUnlike.classList.add('hidden');
      }else{
        postLike.classList.add('hidden');
        postUnlike.classList.remove('hidden');
      }
    });
    postLike.addEventListener('click', function(event){
      if(user.isAnonymous) promptForSignIn();
      else postLikeRef.set(true);
    });
    postUnlike.addEventListener('click', function(event){
      if(user.isAnonymous) promptForSignIn();
      else postLikeRef.set(false);
    });
    var postCommentText = postHTML.querySelector("#post-comment-text");
    var postComment = postHTML.querySelector('#post-comment');
    commentSection.innerHTML = "";
    var postCommentsRef = firebase.database().ref('comments').child(postId);
    postCommentsRef.on('child_added', function(snapshot){
      var commment = snapshot.val();
      commentSection.appendChild(createCommentNode(commment));
    });
    postComment.addEventListener('click', function(event){
      if(user.isAnonymous) {
        promptForSignIn();
        return;
      }
      var text = postCommentText.value;
      if(text === "") return;
      postCommentsRef.push({
        author: user.displayName,
        userId: user.uid,
        text: text,
        timeStamp: new Date().getTime()
      });
      postCommentText.value = "";
    });
  });

  var isAnonymous = user.isAnonymous;
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
}

//Listen for the changes in the user authentication state
firebase.auth().onAuthStateChanged(function(user) {
	if (user) {
    userLoggedIn(user);
	} else {
		console.log("Not logged in");
    //Sign in user since the authentication is required to access database
		firebase.auth().signInAnonymously().catch(function(error){
			console.log(error);
		});
	}
});
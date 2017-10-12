'use strict'
////////////////////////////////////////////////////////////////////////////////
/*global THREE, Coordinates, document, window  */
var camera, scene, renderer, cameraControls, canvasWidth, canvasHeight,
    plane, surfacePointBall, center, lineIn, lineInGeom, rayObject,
    lineMat, gui, params, spikeyGeom,
    intersects;
var objects = [];
var greenBalls = [];
var redBalls = [];
var unseens = [];
var iplane = new THREE.Plane(),
mouse = new THREE.Vector2(),
offset = new THREE.Vector3(),
intersection = new THREE.Vector3(), INTERSECTED, SELECTED; // for grabbing

var projector = new THREE.Projector();
var raycaster = new THREE.Raycaster();
var clock = new THREE.Clock();

function fillScene() {
  // Set up gui sliders
  gui = new dat.GUI({
		autoPlace: false,
    height : (32 * 3)- 1
	});
  
	params = {
		redBalls: 5,
    greenBalls: 5,
    unseens: 5
	}
  
  gui.add(params, 'redBalls').min(3).max(7).step(1).name('Red Balls');
  gui.add(params, 'greenBalls').min(3).max(7).step(1).name('Green Balls');
  gui.add(params, 'unseens').min(3).max(7).step(1).name('Unseens');
	gui.domElement.style.position = "absolute";
	gui.domElement.style.top = "0";
	gui.domElement.style.right = "0";
  
  //skybox
  var imagePrefix = "../images/airport/sky-";
  var imageSuffix = ".png";
  var urls  = [imagePrefix+"xpos"+imageSuffix, imagePrefix+"xneg"+imageSuffix,
  						imagePrefix+"ypos"+imageSuffix, imagePrefix+"yneg"+imageSuffix,
  						imagePrefix+"zpos"+imageSuffix, imagePrefix+"zneg"+imageSuffix];

	scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0x808080, 2000, 4000 );
	scene.add( new THREE.AmbientLight( 0x222222 ) );

	var light = new THREE.DirectionalLight( 0xffffff, 0.9 );
	light.position.set( -200, 500, 500 );
	scene.add( light );

	light = new THREE.DirectionalLight( 0xffffff, 0.6 );
	light.position.set( 100, 100, -400 );
	scene.add( light );

  //grid xz
  var gridXZ = new THREE.GridHelper(2000, 100, new THREE.Color(0xCCCCCC), new THREE.Color(0x888888));
  scene.add(gridXZ);
  
  //axes
  var axes = new THREE.AxisHelper(150);
  axes.position.y = 1;
  scene.add(axes);
  
  // Set up load manager and load image and obj file. 
	var manager = new THREE.LoadingManager();
	manager.onProgress = function ( item, loaded, total ) {
		console.log( item, loaded, total );
	};

	var onProgress = function ( xhr ) {
		if ( xhr.lengthComputable ) {
			var percentComplete = xhr.loaded / xhr.total * 100;
			console.log( Math.round(percentComplete, 2) + '% downloaded' );
		}
	};
	var onError = function ( xhr ) {
	};
  
  var loader = new THREE.OBJLoader( manager );
		loader.load( '../images/spikey.obj', function ( object ) { 
      spikeyGeom = object.children[0].geometry, 
		}, onProgress, onError );
  
  var textureLoader = new THREE.CubeTextureLoader();
  textureLoader.load( urls, function (texture) {
    drawObjects(texture);
    addToDOM();
    animate();
  } );
  
}

function drawObjects( reflectionCube ) {
  rayObject = new THREE.Object3D();
  
  surfacePointBall = new THREE.Mesh( new THREE.SphereGeometry( 15, 12, 12),
                       new THREE.MeshLambertMaterial({ color: 0xffff00 }));
  surfacePointBall.name = 'surfacePoint';
  scene.add( surfacePointBall );
  
  var material = new THREE.MeshPhongMaterial( {
		shininess: 100,
		transparent: true,
		opacity: 0.5,
		envMap: reflectionCube,
    side: THREE.DoubleSide,
		combine: THREE.MixOperation,
		reflectivity: 0.3 } );
	material.color.setRGB( 0.3, 0, 0.3 );
	material.specular.setRGB( 1, 1, 1 );
  
  var geo = new THREE.PlaneGeometry(10000, 10000);
  geo.computeFaceNormals();

  plane = new THREE.Mesh(geo, material)
  plane.name = 'plane';
  scene.add(plane);  
  
  var greenMat = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
  var redMat = new THREE.MeshLambertMaterial({ color: 0xff0000 });
  var hiLiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  
  for ( var i = 0; i < params.greenBalls; i++ ){
    var newBall = new THREE.Mesh( new THREE.SphereGeometry(30, 12, 12), greenMat);
    newBall.class = 1;
    greenBalls.push(newBall);
    objects.push(newBall);
    scene.add(newBall);
    newBall.position.z = 100;
    newBall.position.x = i * 30;
  }

  for ( var i = 0; i < params.redBalls; i++ ){
    var newBall = new THREE.Mesh( new THREE.SphereGeometry(30, 12, 12), redMat);
    newBall.class = -1;
    redBalls.push(newBall);
    objects.push(newBall);
    scene.add(newBall);
    newBall.position.z = -100;
    newBall.position.x = i * 30;
  }
  
  for ( var i = 0; i < params.unseens; i++ ){
    var newUnseen = new THREE.Mesh( spikeyGeom, redMat);
    unseens.push(newUnseen);
    objects.push(newUnseen);
    scene.add(newUnseen);
    newUnseen.position.z = -0;
    newUnseen.position.x = i * 30;
  }  
  
  
  lineMat = new THREE.LineDashedMaterial({
	   color: 0xffffff
  });

  // lineInGeom= new THREE.Geometry();
  // lineInGeom.vertices.push(
	//    greenBall.position,
	//    redConeObj.position
  //  );
  // lineIn = new THREE.Line( lineInGeom, lineMat );
  
}

function init() {
	canvasWidth = 600;
	canvasHeight = 400;


	var canvasRatio = canvasWidth / canvasHeight;

	// RENDERER
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.gammaInput = true;
	renderer.gammaOutput = true;
	renderer.setSize(canvasWidth, canvasHeight);
	renderer.setClearColor( 0xAAAAAA, 1.0 );
  renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
  renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
  renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
  renderer.setPixelRatio( window.devicePixelRatio );
  window.addEventListener( 'resize', onWindowResize, false );

	// CAMERA
	camera = new THREE.PerspectiveCamera( 45, canvasRatio, 1, 8000 );

	// CONTROLS
	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set( -500, 600, 800);
  
	cameraControls.target.set(0,0,0);
}

function addToDOM() {
    var canvas = document.getElementById('canvas');
    canvas.appendChild(renderer.domElement);
    canvas.appendChild(gui.domElement);
}

function animate() {
  updateScene();
	window.requestAnimationFrame(animate);
	render();
}

function calculateMargin() {
  
}

function calculateHyperPlane() {
  calculateMargin();
  
}

function updateScene(){
  calculateHyperPlane()
}

function render() {
	var delta = clock.getDelta();
	cameraControls.update(delta);
	camera.updateMatrixWorld();
  
	renderer.render(scene, camera);
}


function onDocumentMouseMove( event ) {
	event.preventDefault();
  // this converts window mouse values to x and y mouse coordinates that range
  // between -1 and 1 in the canvas
  mouse.set(
     (( event.clientX / window.innerWidth ) * 2 - 1) *
     (window.innerWidth/canvasWidth),
     (-((event.clientY - ($("#canvas").position().top + (canvasHeight/2))) / window.innerHeight) * 2 )
     * (window.innerHeight/canvasHeight));

  // uses Three.js built-in raycaster to send a ray from the camera
	raycaster.setFromCamera( mouse, camera );
	if ( SELECTED ) {
    if ( raycaster.ray.intersectPlane( iplane, intersection ) ) {
          var prevPos = SELECTED.position.clone();
          SELECTED.position.copy( intersection.sub( offset ) );
    }
		return;
	}

  // determines which objects are intersected by the ray, and sets the dragging
  // iplane with respect to the camera view.
	intersects = raycaster.intersectObjects(objects, true);
	if ( intersects.length > 0 ) {
		if ( INTERSECTED != intersects[0].object ) {
			INTERSECTED = intersects[0].object;
			iplane.setFromNormalAndCoplanarPoint(
        camera.getWorldDirection( iplane.normal ),
        INTERSECTED.position);
		}
		canvas.style.cursor = 'pointer';
	} else {
		INTERSECTED = null;
		canvas.style.cursor = 'auto';
	}
}

// handles mouse down event
function onDocumentMouseDown( event ) {
	event.preventDefault();
	raycaster.setFromCamera( mouse, camera );
	var intersects = raycaster.intersectObjects( objects );
	if ( intersects.length > 0 ) {
		cameraControls.enabled = false;
		SELECTED = intersects[ 0 ].object.userData.parent || intersects[ 0 ].object;
		if ( raycaster.ray.intersectPlane( iplane, intersection ) ) {
			offset.copy( intersection ).sub( SELECTED.position );
		}
		canvas.style.cursor = 'move';
	}
}

// handles mouse up event
function onDocumentMouseUp( event ) {
	event.preventDefault();
	cameraControls.enabled = true;
	if ( INTERSECTED ) {
		SELECTED = null;
	}
	canvas.style.cursor = 'auto';
}

function toXYCoords (pos) {
  //var vector = projector.projectVector(pos.clone(), camera);
	var vector = pos.clone().project(camera);
	vector.x = (vector.x + 1)/2 * canvasWidth;
	vector.y = -(vector.y - 1)/2 * canvasHeight;
	//console.log(vector);
  return vector;
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

try {
  init();
  fillScene();
} catch(error) {
    console.log("Your program encountered an unrecoverable error, can not draw on canvas. Error was:");
    console.log(error);
}

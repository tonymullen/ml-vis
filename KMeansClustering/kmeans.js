'use strict'
////////////////////////////////////////////////////////////////////////////////
/*global THREE, Coordinates, document, window  */
var camera, scene, renderer, cameraControls, canvasWidth, canvasHeight,
    greenBall, redCone, redConeObj, plane, rayObject,
    surfacePointBall, center, lineIn, lineInGeom,
    lineMat, greenBalllabel, redConelabel, gui, params, 
    intersects;
var objects = [];
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
		planeAngleX: 0,
    planeAngleY: 0,
    planePosition: -400,
    rayAngleX: 0, 
    rayAngleY: 0,
    
	}
  
  gui.add(params, 'planeAngleX').min(-25.0).max(25.0).step(1).name('Plane Rot X');
  gui.add(params, 'planeAngleY').min(-25.0).max(25.0).step(1).name('Plane Rot Y');
  gui.add(params, 'planePosition').min(-600).max(-100).step(5).name('Plane Pos');
  gui.add(params, 'rayAngleX').min(-25.0).max(25.0).step(1).name('Ray Rot X');
  gui.add(params, 'rayAngleY').min(-25.0).max(25.0).step(1).name('Ray Rot Y');
	gui.domElement.style.position = "relative";
	gui.domElement.style.top = "-400px";
	gui.domElement.style.left = "350px";
  
  //skybox
  var imagePrefix = "images/airport/sky-";
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
  
  greenBall = new THREE.Mesh( new THREE.SphereGeometry( 30, 12, 12),
                       new THREE.MeshLambertMaterial({ color: 0x00ff00 }));
  rayObject.add( greenBall );
  greenBall.userData.parent = rayObject;
  
  
  redCone = new THREE.Mesh( new THREE.ConeGeometry( 50, 100, 32 ),
                       new THREE.MeshLambertMaterial({ color: 0xff0000 }));
  redCone.rotateX( -Math.PI/2 );
  redConeObj = new THREE.Object3D();
  redConeObj.add( redCone );
  redConeObj.position.z = -600;
  rayObject.add( redConeObj );
  
  lineMat = new THREE.LineBasicMaterial({
	   color: 0x000000
  });

  lineInGeom= new THREE.Geometry();
  lineInGeom.vertices.push(
	   greenBall.position,
	   redConeObj.position
   );
  lineIn = new THREE.Line( lineInGeom, lineMat );
  
  rayObject.add( lineIn );
  scene.add( rayObject );
  
  // objects that we want to test for intersection (picking) by
  // the ray caster. i.e objects we want to be able to drag in the scene
  objects = [greenBall];
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

	// CAMERA
	camera = new THREE.PerspectiveCamera( 45, canvasRatio, 1, 8000 );

	// CONTROLS
	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	camera.position.set( -500, 600, 800);
  
	cameraControls.target.set(4,301,92);
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

function calculateIntersection() {
  
  plane.updateMatrixWorld();
  // Docs: The normal matrix is the transpose of the inverse of the upper left 
  // 3x3 sub-matrix of this object's modelViewMatrix. The reason for this special 
  // matrix is that simply using the modelViewMatrix could result in a 
  // non-unit length of normals (on scaling) or in a non-perpendicular 
  // direction (on non-uniform scaling).

  // On the other hand the translation part of the modelViewMatrix is not relevant 
  // for the calculation of normals. Thus a Matrix3 is sufficient.
  var nmat = new THREE.Matrix3().getNormalMatrix( plane.matrixWorld );
    
  // Below are two options for getting the normal. In either case our coordinates
  // are in object space initially, so we need to extract the normal matrix from 
  // the world matrix. 
  
  // We can cross product with edges:
  /*
  var normal = new THREE.Vector3().crossVectors((plane.geometry.vertices[0].clone())
                      .sub(plane.geometry.vertices[1]).clone(), 
                    (plane.geometry.vertices[3].clone())
                      .sub(plane.geometry.vertices[1]).clone())
                    .normalize().applyMatrix3(nmat);
  */
  // Or we use the .normal attribute of a face. 
  var normal =  new THREE.Vector3().copy(plane.geometry.faces[0].normal.clone().applyMatrix3(nmat))

  var toPoint = new THREE.Vector3().subVectors(
    plane.geometry.vertices[0].clone().applyMatrix4(plane.matrixWorld),
    greenBall.position.clone()
  );
  
  var p0 = new THREE.Vector3().copy(greenBall.position.clone().applyMatrix4(rayObject.matrixWorld));
  
  var d = toPoint.dot(normal.clone().multiplyScalar(-1));
  surfacePointBall.position.copy(normal.clone().multiplyScalar(-1 * d));
  
  var ray = new THREE.Vector3().subVectors(
    redConeObj.position.clone().applyMatrix4(redConeObj.matrixWorld),
    p0,
  ).normalize();
  
  var t = -((p0.dot(normal) + d) / (ray.dot(normal)))
  surfacePointBall.position.copy(p0.clone().add(ray.clone().multiplyScalar(t)));

  
}

function updateScene(){
  calculateIntersection()
  plane.rotation.x = params.planeAngleX * Math.PI/180;
  plane.rotation.y = params.planeAngleY * Math.PI/180;
  plane.position.z = params.planePosition;
  rayObject.rotation.x = params.rayAngleX * Math.PI/180;
  rayObject.rotation.y = params.rayAngleY * Math.PI/180;
  lineInGeom.vertices = [greenBall.position, redConeObj.position];
  lineInGeom.verticesNeedUpdate = true;
  redConeObj.lookAt(greenBall.position);
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


try {
  init();
  fillScene();
} catch(error) {
    console.log("Your program encountered an unrecoverable error, can not draw on canvas. Error was:");
    console.log(error);
}

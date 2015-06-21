TweenMax.to("#logo", 2, {left:600});

var scene, camera, renderer;

window.request

init();
animate();

function init() {
  scene = new THREE.Scene();
  var WIDTH = window.innerWidth;
  var HEIGHT = window.innerHeight;

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(WIDTH, HEIGHT);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 20000);
  camera.position.set(0,10,0);
  scene.add(camera);

  renderer.setClearColor(0x333F47, 1);

  var light = new THREE.PointLight(0xffffff);
  light.position.set(-100,200,100);
  scene.add(light);

  var geometry = new THREE.TetrahedronGeometry(1, 0);
  var material = new THREE.MeshDepthMaterial( { wireframe: true } );
  THREE.pyramid = new THREE.Mesh(geometry, material);
  scene.add(THREE.pyramid);

  // var colladaLoader = new THREE.ColladaLoader();
  // var dae = colladaLoader.load(
  //   'https://s3-us-west-1.amazonaws.com/koatasc/models/orbs.dae',
  //   function (collada) {
  //     scene.add(collada.scene );
  //   });


  THREE.controls = new THREE.OrbitControls(camera, renderer.domElement);
}

function animate() {
  requestAnimationFrame(animate);

  THREE.pyramid.rotation.x += 0.05;
  THREE.pyramid.rotation.y -= 0.05;
  renderer.render(scene, camera);
  THREE.controls.update();
}

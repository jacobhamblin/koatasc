TweenMax.to("#logo", 2, {left:window.innerWidth/2-100});

var scene, camera, renderer;

window.request

init();
animate();

function init() {
  scene = new THREE.Scene();
  var WIDTH = window.innerWidth - 20;
  var HEIGHT = window.innerHeight - 20;

  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(WIDTH, HEIGHT);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 20000);
  camera.position.set(0,10,0);
  camera.near = 5;
  camera.far = 15;
  scene.add(camera);

  renderer.setClearColor(0x111111, 1);

  // var light = new THREE.AmbientLight(0xffffff, 1, 100);
  // light.position.set(0,10,0);
  // scene.add(light);

  var light = new THREE.AmbientLight ( 0x404040 );
  scene.add(light);



  var triangles = 16;
  THREE.triangles = [];
  for (var i = 0; i < triangles; i++) {
    var radius = Math.random();
    var geometry = new THREE.TetrahedronGeometry(radius, 0);
    var material = new THREE.MeshDepthMaterial( { } );
    var pyramid = new THREE.Mesh(geometry, material);
    scene.add(pyramid);
    var x = Math.random() * 6;
    var y = Math.random() * 6;
    var z = Math.random() * 6;
    pyramid.position.set(x - 3, y - 3, z - 3);
    pyramid.rotX = (Math.random() /5) - .1;
    pyramid.rotY = (Math.random() /5) - .1;
    pyramid.timing = Math.floor(Math.random() * 10);
    THREE.triangles.push(pyramid);
  }



  // THREE.pyramid = new THREE.Mesh(geometry, material);
  // THREE.pyramidTwo = new THREE.Mesh(geometry, material);
  // scene.add(THREE.pyramid);
  // scene.add(THREE.pyramidTwo);
  // THREE.pyramidTwo.position.set(2, 2, 2);
  // THREE.pyramid.position.set(-2, -2, -2);

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

  for (var i = 0; i < THREE.triangles.length; i++) {
    if (Math.round(new Date().getTime() * .001) % THREE.triangles[i].timing == 0) {
      var rotX = (Math.random() /5) - .1;
      var rotY = (Math.random() /5) - .1;

      THREE.triangles[i].rotation.x += rotX;
      THREE.triangles[i].rotation.y -= rotY;
    } else {
      THREE.triangles[i].rotation.x += THREE.triangles[i].rotX;
      THREE.triangles[i].rotation.y -= THREE.triangles[i].rotY;
    }

  }
  renderer.render(scene, camera);
  THREE.controls.update();
}

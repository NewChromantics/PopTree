import Pop from './PopEngineCommon/PopEngine.js'
import {SdfFragShader,SdfVertShader,SdfUniformDescriptions} from './Shaders.js'
import {CreateBlitQuadGeometry} from './PopEngineCommon/CommonGeometry.js' 
import {Camera as PopCamera} from './PopEngineCommon/Camera.js'
/*
const SdfFragShader = 
`
precision highp float;
varying vec2 uv;
void main()
{
	gl_FragColor = vec4(uv,0,1);
}
`;
*/
let Time = 0;
let Camera = new PopCamera();


function ControlCamera_MouseWheel(x,y,Button,Scroll)
{
	const Zoom = Scroll[1] * 10;// * 0.1;
	//if ( Button == 'Left' )
	{
		Camera.OnCameraPanLocal( 0, 0, 0, true );
		Camera.OnCameraPanLocal( 0, 0, Zoom );
	}
	//Pop.Debug(`ControlCamera_MouseWheel(${Array.from(arguments)})`);
}
function ControlCamera_MouseDown(x,y,Button)
{
	//Pop.Debug(`ControlCamera_MouseDown(${Array.from(arguments)})`);
	if ( Button == 'Left' )
		Camera.OnCameraOrbit( x, y, 0, true );
	if ( Button == 'Right' )
		Camera.OnCameraPanLocal( -x, -y, 0, true );
}

function ControlCamera_MouseMove(x,y,Button)
{
	if ( Button == 'Left' )
		Camera.OnCameraOrbit( x, y, 0 );
	if ( Button == 'Right' )
		Camera.OnCameraPanLocal( -x, -y, 0 );
	
	//Pop.Debug(`ControlCamera_MouseMove(${Array.from(arguments)})`);
}
function ControlCamera_MouseUp()
{
	//Pop.Debug(`ControlCamera_MouseUp(${Array.from(arguments)})`);
}


function GetRenderCommands(Assets)
{
	const Commands = [];
	
	Time = (Time+0.05) % 1.0;
	const Clear = ['SetRenderTarget',null,[1,0,Time]];
	Commands.push(Clear);
	
	//	draw a cube
	/*
	{
		const Uniforms = {};
		Commands.push(['Draw',Assets.CubeGeo,Assets.SdfShader,Uniforms]);
	}
	*/
	
	{
		const Uniforms = {};
		Uniforms.TimeSecs = (Pop.GetTimeNowMs() / 1000) % 60;
		const PopMath = Pop.Math;
		const RenderViewport = [0,0,1,1];
		const WorldToCameraMatrix = Camera.GetWorldToCameraMatrix();
		const CameraProjectionMatrix = Camera.GetProjectionMatrix( RenderViewport );
		const ScreenToCameraTransform = PopMath.MatrixInverse4x4( CameraProjectionMatrix );
		const CameraToWorldTransform = PopMath.MatrixInverse4x4( WorldToCameraMatrix );
		//const LocalToWorldTransform = Camera.GetLocalToWorldFrustumTransformMatrix();
		const LocalToWorldTransform = PopMath.CreateIdentityMatrix();
		const WorldToLocalTransform = PopMath.MatrixInverse4x4(LocalToWorldTransform);

		Uniforms.ScreenToCameraTransform = ScreenToCameraTransform;
		Uniforms.CameraToWorldTransform = CameraToWorldTransform;
		Commands.push(['Draw',Assets.CubeGeo,Assets.SdfShader,Uniforms]);
	}

	//Commands.push(['SetRenderTarget',null,[0,Time,0]]);
	
	return Commands;
}

async function RenderLoop(Canvas)
{
	//const Window = new Pop.Gui.Window();
	let Window;
	const RenderView = new Pop.Gui.RenderView(Window,Canvas);
	RenderView.OnMouseScroll = ControlCamera_MouseWheel;
	RenderView.OnMouseDown = ControlCamera_MouseDown;
	RenderView.OnMouseMove = ControlCamera_MouseMove;
	RenderView.OnMouseUp = ControlCamera_MouseUp;
	
	//const RenderContext = new Pop.Opengl.Context(RenderView);
	const RenderContext = new Pop.Opengl.Context(Canvas);
	
	const Assets = {};
	const Geo = CreateBlitQuadGeometry();
	Assets.CubeGeo = await RenderContext.CreateGeometry( Geo );
	Assets.SdfShader = await RenderContext.CreateShader( SdfVertShader, SdfFragShader, SdfUniformDescriptions );
	
	while ( true )
	{
		const RenderCommands = GetRenderCommands(Assets);
		await RenderContext.Render(RenderCommands);
		await Pop.Yield(10);
	}
}

export default function Bootup(Canvas)
{
	RenderLoop(Canvas);
}

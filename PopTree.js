import Pop from './PopEngineCommon/PopEngine.js'
import {SdfFragShader,SdfVertShader,SdfUniformDescriptions} from './Shaders.js'
import {CreateCubeGeometry} from './PopEngineCommon/CommonGeometry.js' 



let Time = 0;

function GetRenderCommands(Assets)
{
	const Commands = [];
	
	Time = (Time+0.05) % 1.0;
	const Clear = ['SetRenderTarget',null,[1,0,Time]];
	Commands.push(Clear);
	//Commands.push(['SetRenderTarget',null,[0,Time,0]]);
	
	return Commands;
}

async function RenderLoop(Canvas)
{
	const Window = new Pop.Gui.Window();
	const RenderView = new Pop.Gui.RenderView(Window,Canvas);
	//const RenderContext = new Pop.Opengl.Context(RenderView);
	const RenderContext = new Pop.Opengl.Context(Canvas);
	
	const Assets = {};
	Assets.CubeGeo = await RenderContext.CreateGeometry( CreateCubeGeometry() );
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

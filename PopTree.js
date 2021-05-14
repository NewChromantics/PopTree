import Pop from './PopEngineCommon/PopEngine.js'


function GetRenderCommands()
{
	const Commands = [];
	
	const Clear = ['SetRenderTarget',null,[1,0,0]];
	Commands.push(Clear);
	
	return Commands;
}

async function RenderLoop(Canvas)
{
	const Window = new Pop.Gui.Window();
	const RenderView = new Pop.Gui.RenderView(Window,Canvas);
	//const RenderContext = new Pop.Opengl.Context(RenderView);
	const RenderContext = new Pop.Opengl.Context(Canvas);
	
	while ( true )
	{
		const RenderCommands = GetRenderCommands();
		await RenderContext.Render(RenderCommands);
		await Pop.Yield(100);
	}
}

export default function Bootup(Canvas)
{
	RenderLoop(Canvas);
}

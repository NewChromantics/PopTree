

export default class PopEngineCanvas extends HTMLElement 
{
	constructor()
	{
		super();
		
		//	Create a shadow root
		const Shadow = this.attachShadow({mode: 'open'});
		this.SetupDom(Shadow);
		this.ShadowDom = Shadow;	//	gr: save this so we can add the image picker to something later
	}
	
	//	reflect our properties
	static get observedAttributes() 
	{
		return ['value'];
	}
	get value()			{	return this.getAttribute('value');	}
	set value(newValue)	{	this.setAttribute('value', newValue);	}

	async Bootup()
	{
	}

	CreateCanvas()
	{
		const Canvas = document.createElement('canvas');
		Canvas.width = 640;
		Canvas.height = 480;
		return Canvas;
	}

	SetupDom(Parent)
	{
		this.Canvas = this.CreateCanvas();

		// Create some CSS to apply to the shadow dom
		const Style = document.createElement('style');
		Style.textContent = `
		:host /* shadow dom root */
		{
			display:		flex;
			flex-direction: column;
			background:		lime;
			xoverflow:		hidden;
			
			min-width:		20px;
			min-height:		20px;
		}
		
		canvas
		{
			border:		1px black solid;
			min-width:	10px;
			min-height:	10px;
			flex-grow:	1;		/* make this flexchild biggest */
			width:		100%;	/* resizes image (smaller) to fit the flexchild */
			/* doesn't seem to be needed to make it scale right
			height:	100%;	 
			resize: both;
			object-fit: cover;
			xobject-fit: scale-down;
			*/
		}
		
		`;

		// attach the created elements to the shadow dom
		Parent.appendChild(Style);
		Parent.appendChild(this.Canvas);
	}
	
	
	attributeChangedCallback(name, oldValue, newValue) 
	{
		console.log(`attributeChangedCallback(name=${name}) [${oldValue}]->[${newValue}]`);
		/*
		this.LoadValues();
		
		//	do callback any time it changes AFTER we've loaded
		if ( this.LoadedValues )
			this.OnUserChangedValue();
		*/
	}
	
	connectedCallback()
	{
		//this.LoadValues();
		console.log(`connectedCallback`);
		//this.LoadedValues = true;
		this.Bootup().then(this.OnFinished.bind(this)).catch(this.OnError.bind(this));
	}
	
	OnFinished()
	{
		console.log(`PopEngine Canvas finished`);
	}
	
	OnError(Error)
	{
		console.error(`PopEngine Canvas Error; ${Error}`);
		if ( this.onerror )
			this.onerror(Error);
	}
}

//	name requires dash!
window.customElements.define('popengine-canvas', PopEngineCanvas);

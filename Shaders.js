const Default = `Some shader source`;
export default Default;


export const SdfUniformDescriptions = 
[
{Name:'ScreenToCameraTransform',Type:'mat4'},
{Name:'CameraToWorldTransform',Type:'mat4'},
{Name:'TimeSecs',Type:'float'},
];


export const SdfVertShader = `
//uniform vec4 VertexRect;// = vec4(0,0,1,1);
const vec4 VertexRect = vec4(0,0,1,1);
in vec2 TexCoord;
out vec2 uv;

void main()
{
	gl_Position = vec4(TexCoord.x,TexCoord.y,0,1);
	
	float l = VertexRect[0];
	float t = VertexRect[1];
	float r = l+VertexRect[2];
	float b = t+VertexRect[3];
	
	l = mix( -1.0, 1.0, l );
	r = mix( -1.0, 1.0, r );
	//	gr: this is upside down as gl textures start bottom left 0,0
	//		but... are we just flipping and flipping back somewhere
	t = mix( 1.0, -1.0, t );
	b = mix( 1.0, -1.0, b );
	
	gl_Position.x = mix( l, r, TexCoord.x );
	gl_Position.y = mix( t, b, TexCoord.y );
	
	uv = vec2( TexCoord.x, TexCoord.y );
}
`;

export const SdfFragShader = `
precision highp float;
varying vec2 uv;

uniform mat4 ScreenToCameraTransform;
uniform mat4 CameraToWorldTransform;
const vec4 Sphere = vec4(0,0,0,0.5);
const bool DrawNormals = false;
const bool DrawShadows = true;
const bool DrawHeat = false;

uniform float TimeSecs;

const vec3 WorldUp = vec3(0,-1,0);
const float FloorY = 2.0;
#define FAR_Z		40.0
#define MAX_STEPS	120


float Range(float Min,float Max,float Value)
{
	return (Value-Min) / (Max-Min);
}

vec3 Range3(vec3 Min,vec3 Max,vec3 Value)
{
	Value.x = Range( Min.x, Max.x, Value.x );
	Value.y = Range( Min.y, Max.y, Value.y );
	Value.z = Range( Min.z, Max.z, Value.z );
	return Value;
}

vec3 ScreenToWorld(float2 uv,float z)
{
	//float x = mix( -1.0, 1.0, uv.x );
	//float y = mix( 1.0, -1.0, uv.y );
	float x = mix( -1.0, 1.0, uv.x );
	float y = mix( -1.0, 1.0, uv.y );
	vec4 ScreenPos4 = vec4( x, y, z, 1.0 );
	vec4 CameraPos4 = ScreenToCameraTransform * ScreenPos4;
	vec4 WorldPos4 = CameraToWorldTransform * CameraPos4;
	vec3 WorldPos = WorldPos4.xyz / WorldPos4.w;
	
	return WorldPos;
}

//	gr: returning a TRay, or using TRay as an out causes a very low-precision result...
void GetWorldRay(out vec3 RayPos,out vec3 RayDir)
{
	float Near = 0.01;
	float Far = 10.0;
	RayPos = ScreenToWorld( uv, Near );
	RayDir = ScreenToWorld( uv, Far ) - RayPos;
	
	RayDir = normalize(RayDir);
	//	gr: this is backwards!
	RayDir = -normalize( RayDir );
}

float PingPongNormal(float Normal)
{
	//	0..1 to 0..1..0
	if ( Normal >= 0.5 )
	{
		Normal = Range( 1.0, 0.5, Normal );
	}
	else
	{
		Normal = Range( 0.0, 0.5, Normal );
	}
	return Normal;
}


float sdBox( vec3 p, vec3 b )
{
	vec3 q = abs(p) - b;
	return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}

float DistanceToBox(vec3 Position,vec3 BoxCenter,vec3 BoxRadius)
{
	return sdBox( Position-BoxCenter, BoxRadius );
}

float DistanceToSphere(vec3 Position)
{
	//	bend shape
	vec3 p = Position;
	float k = 2.70;//TimeSecs*0.1; // or some other amount
    float c = cos(k*p.x);
    float s = sin(k*p.x);
    mat2  m = mat2(c,-s,s,c);
    vec3  q = vec3(m*p.xy,p.z);
    
    Position = q;
	return DistanceToBox( Position, Sphere.xyz, Sphere.www );
	
	//float SphereRadius = PingPongNormal(fract(TimeSecs)) * Sphere.w;
	float SphereRadius = Sphere.w;
	float Distance = length(Sphere.xyz - Position);
	Distance -= SphereRadius;
	return Distance;
}

float sdPlane( vec3 p, vec3 n, float h )
{
	// n must be normalized
	return dot(p,n) + h;
}


float DistanceToFloor(vec3 Position)
{
	float Distance = sdPlane( Position, WorldUp, FloorY );
	return Distance;
}


float map(vec3 Position)
{
	float SphereDistance = DistanceToSphere( Position );
	float FloorDistance = DistanceToFloor( Position );
	return min( SphereDistance, FloorDistance );
}

//	xyz heat (0= toofar/miss)
vec4 GetSceneIntersection(vec3 RayPos,vec3 RayDir)
{
	RayDir = normalize(RayDir);
	const float CloseEnough = 0.0001;
	const float MinStep = CloseEnough;
	const float MaxDistance = FAR_Z;
	const int MaxSteps = MAX_STEPS;
	
	//return vec4( RayPos, 1.0 );
	//return vec4( RayPos + RayDir * 1.0, 1.0 );
	
	//	time = distance
	float RayTime = 0.0;
	
	for ( int s=0;	s<MaxSteps;	s++ )
	{
		vec3 Position = RayPos + RayDir * RayTime;
		
		//	intersect scene
		float HitDistance = map( Position );
		if ( HitDistance <= CloseEnough )
		{
			float Heat = 1.0 - (float(s)/float(MaxSteps));
			return vec4( Position, Heat );
		}

		RayTime += max( HitDistance, MinStep );
		
		//	ray gone too far
		if (RayTime > MaxDistance)
			return vec4(Position,0);
	}
	
	return vec4(0,0,0,0);
}


vec3 calcNormal( in vec3 pos )
{
	vec2 e = vec2(1.0,-1.0)*0.5773;
	const float eps = 0.0005;
	return normalize( e.xyy * map( pos + e.xyy*eps ) + 
					  e.yyx * map( pos + e.yyx*eps ) + 
					  e.yxy * map( pos + e.yxy*eps ) + 
					  e.xxx * map( pos + e.xxx*eps ) );
}


float HeatToShadow(float Heat)
{
	return Heat > 0.0 ? 1.0 : 0.0;
	return clamp( Range( 0.0, 0.5, Heat ), 0.0, 1.0 );
}

void main()
{
	vec3 Background = vec3(0.70,0.75,0.79);
	
	vec3 RayPos,RayDir;
	GetWorldRay(RayPos,RayDir);
	vec4 Intersection = GetSceneIntersection( RayPos, RayDir );

	if ( Intersection.w <= 0.0 )
	{
		gl_FragColor = vec4(Background,1);
		return;
	}
	
	vec3 Colour;
	vec3 Normal = calcNormal(Intersection.xyz);
	{
		Colour = Range3( vec3(-1,-1,-1), vec3(1,1,1), Normal );
	}
	Colour = mix( Background, Colour, Intersection.w );

	if ( DrawNormals )
	{
		vec3 Normal = calcNormal(Intersection.xyz);
		Normal = Range3( vec3(-1,-1,-1), vec3(1,1,1), Normal );
		gl_FragColor = vec4( Normal,1.0);
		return;
	}
	
	if ( DrawHeat )
	{
		float Shadow = HeatToShadow( Intersection.w );
		gl_FragColor = vec4( Shadow, Shadow, Shadow, 1.0);
		return;
	}
	
	//	do a hard shadow pass by shooting a ray to the sun
	if ( DrawShadows )
	{
		//vec3 DirToLight = vec3(0.001,-0.99,0.001);
		vec3 LightPos = vec3( sin(TimeSecs)*20.0, 50.0, cos(TimeSecs)*20.0 );
		vec3 DirToLight = normalize(Intersection.xyz - LightPos);
		//vec3 PositionToLight = Intersection.xyz+(Normal*0.002);
		vec3 PositionToLight = Intersection.xyz+(DirToLight*0.003);
		vec4 LightIntersection = GetSceneIntersection( PositionToLight, DirToLight );
		float Shadow = HeatToShadow( LightIntersection.w );
		Colour = mix( Colour, vec3(0,0,0), Shadow );
	}
	
/*
	float Distance = length( Intersection.xyz - RayPos );

	//Distance = Intersection.z / 4.2;
	//Distance /= 1.0;
	
	//	show hit
	//Distance = Intersection.w;
	*/
	
	{
		gl_FragColor = vec4(Colour,1);
	}
}
`;


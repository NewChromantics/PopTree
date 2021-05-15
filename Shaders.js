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

uniform float TimeSecs;

#define FAR_Z		50.0
#define MAX_STEPS	30

float Range(float Min,float Max,float Value)
{
	return (Value-Min) / (Max-Min);
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

float DistanceToSphere(vec3 Position)
{
	float SphereRadius = PingPongNormal(fract(TimeSecs)) * Sphere.w;
	float Distance = length(Sphere.xyz - Position);
	Distance -= SphereRadius;
	return Distance;
}

//	xyz valid
vec4 GetSceneIntersection(vec3 RayPos,vec3 RayDir)
{
	RayDir = normalize(RayDir);
	const float MinDistance = 0.001;
	const float CloseEnough = MinDistance;
	const float MinStep = MinDistance;
	const float MaxDistance = FAR_Z;
	const int MaxSteps = MAX_STEPS;
	
	//return vec4( RayPos, 1.0 );
	//return vec4( RayPos + RayDir * 1.0, 1.0 );
	
	float RayTime = 0.0;
	
	for ( int s=0;	s<MaxSteps;	s++ )
	{
		vec3 Position = RayPos + RayDir * RayTime;
		
		//	intersect scene
		float SphereDistance = DistanceToSphere( Position );
		
		
		float HitDistance = SphereDistance;
		
		//RayTime += max( HitDistance, MinStep );
		RayTime += HitDistance;
		if ( HitDistance < CloseEnough )
			return vec4(Position,1);
		
		//	ray gone too far
		if (RayTime > MaxDistance)
			return vec4(Position,0);
	}
	
	return vec4(0,0,0,0);
}

void main()
{
	vec3 RayPos,RayDir;
	GetWorldRay(RayPos,RayDir);
	vec4 Intersection = GetSceneIntersection( RayPos, RayDir );

	float Distance = length( Intersection.xyz - RayPos );

	//Distance = Intersection.z / 4.2;
	//Distance /= 1.0;
	
	//	show hit
	//Distance = Intersection.w;
	
	if ( Intersection.w < 1.0 )
		Distance = 0.0;

	gl_FragColor = vec4(Distance,0,0,1);
}
`;


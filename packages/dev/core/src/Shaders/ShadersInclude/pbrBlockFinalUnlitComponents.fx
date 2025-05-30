// _____________________________ Diffuse ________________________________________
vec3 finalDiffuse = diffuseBase;
finalDiffuse *= surfaceAlbedo;

#if defined(SS_REFRACTION) && !defined(UNLIT)
    finalDiffuse *= subSurfaceOut.refractionOpacity;
#endif
#if defined(SS_TRANSLUCENCY) && !defined(UNLIT)
    finalDiffuse += diffuseTransmissionBase;
#endif
finalDiffuse = max(finalDiffuse, 0.0);
finalDiffuse *= vLightingIntensity.x;

// _____________________________ Ambient ________________________________________
vec3 finalAmbient = vAmbientColor;
finalAmbient *= surfaceAlbedo.rgb;

// _____________________________ Emissive ________________________________________
vec3 finalEmissive = vEmissiveColor;
#ifdef EMISSIVE
vec3 emissiveColorTex = texture2D(emissiveSampler, vEmissiveUV + uvOffset).rgb;
#ifdef GAMMAEMISSIVE
    finalEmissive *= toLinearSpace(emissiveColorTex.rgb);
#else
    finalEmissive *= emissiveColorTex.rgb;
#endif
finalEmissive *=  vEmissiveInfos.y;
#endif
finalEmissive *= vLightingIntensity.y;

// ______________________________ Ambient ________________________________________
#ifdef AMBIENT
vec3 ambientOcclusionForDirectDiffuse = mix(vec3(1.), aoOut.ambientOcclusionColor, vAmbientInfos.w);
#else
vec3 ambientOcclusionForDirectDiffuse = aoOut.ambientOcclusionColor;
#endif

finalAmbient *= aoOut.ambientOcclusionColor;
finalDiffuse *= ambientOcclusionForDirectDiffuse;

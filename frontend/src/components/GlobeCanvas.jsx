import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import ThreeGlobe from 'three-globe'
import { feature } from 'topojson-client'
import { useThemeContext } from '../context/ThemeContext'

export default function GlobeCanvas() {
  const mountRef = useRef(null)
  const { isDark } = useThemeContext()

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const W = mount.offsetWidth  || 420
    const H = mount.offsetHeight || 340

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(45, W / H, 1, 2000)
    camera.position.set(0, 0, 280)
    camera.lookAt(0, 0, 0)

    scene.add(new THREE.AmbientLight(0xffffff, isDark ? 0.6 : 0.9))
    const dirLight = new THREE.DirectionalLight(0xffffff, isDark ? 0.5 : 0.8)
    dirLight.position.set(300, 200, 300)
    scene.add(dirLight)

    const Globe = new ThreeGlobe({ animateIn: false })
    scene.add(Globe)

    const globeColor = isDark ? '#0a1525' : '#e0f2fe'
    const atmosphereColor = isDark ? '#0ea5e9' : '#7dd3fc'
    const hexColor = isDark ? 'rgba(16,185,129,0.6)' : 'rgba(14,165,233,0.7)'

    fetch('https://unpkg.com/world-atlas@2/countries-110m.json')
      .then(r => r.json())
      .then(world => {
        const countries = feature(world, world.objects.countries)

        Globe
          .showGlobe(true)
          .globeMaterial(new THREE.MeshPhongMaterial({
            color: globeColor,
            opacity: isDark ? 0.8 : 0.6,
            transparent: true,
          }))
          .showAtmosphere(true)
          .atmosphereColor(atmosphereColor)
          .atmosphereAltitude(isDark ? 0.25 : 0.2)
          .hexPolygonsData(countries.features)
          .hexPolygonResolution(3)
          .hexPolygonMargin(0.3)
          .hexPolygonColor(() => hexColor)
      })
      .catch(() => {
        Globe
          .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
          .showAtmosphere(true)
          .atmosphereColor(atmosphereColor)
          .atmosphereAltitude(0.15)
      })

    let animId
    const animate = () => {
      animId = requestAnimationFrame(animate)
      Globe.rotation.y += 0.0012
      renderer.render(scene, camera)
    }
    animate()

    const handleResize = () => {
      const nW = mount.offsetWidth
      const nH = mount.offsetHeight
      camera.aspect = nW / nH
      camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [isDark])

  // Stronger glow in dark mode
  const glowGradient = isDark
    ? 'radial-gradient(circle, rgba(16,185,129,0.35) 0%, rgba(14,165,233,0.2) 55%, transparent 100%)'
    : 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, rgba(56,189,248,0.14) 55%, transparent 100%)'

  return (
    // ── outer wrapper with the blurry glow circle behind the canvas
    <div style={{ position: 'relative', width: '100%', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

      {/* ── Blurry teal glow — mimics SafeLine's circle */}
      <div style={{
        position: 'absolute',
        width: '260px',
        height: '260px',
        borderRadius: '50%',
        background: glowGradient,
        filter: isDark ? 'blur(28px)' : 'blur(22px)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      {/* ── Canvas mount sits on top of the glow */}
      <div
        ref={mountRef}
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          height: '340px',
        }}
      />
    </div>
  )
}
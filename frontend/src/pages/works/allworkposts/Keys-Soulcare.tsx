import React, { useEffect, useState, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";

import { gsap } from "gsap";
import "./workpage.css";
import ReactModal from "react-modal";


import { useScrollContext } from "@/app/contexts/useScrollContext";




import Ticker from "../../../shared/ui/ticker";
import { InfoSection } from "../../../shared/ui";
import SingleTicker from "../../../shared/ui/singleTicker";

import { useData } from "@/app/contexts/useData";
import InlineSvg from "../../../shared/ui/inlinesvg";

const KeysSoulcare = () => {

    
        const pageTitle = "Keys Soulcare Immersive Space Design - Hamburg, Germany";
        const pageDescription =
            "*MYLG!* rendered a fully immersive 3D space for Keys Soulcare in collaboration with Mokibaby. The stunning visuals and branding helped secure client approval and bring this vision to life at Haller 6 in Hamburg.";
        const canonicalUrl = "https://mylg.studio/works/Keys-Soulcare";
        const ogImage = "https://d2qb21tb4meex0.cloudfront.net/19-Keys+Soulcare/01+Keys+Soulcare.jpg";
    
        const structuredData = {
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            "name": "Keys Soulcare Immersive Space Design",
            "description": pageDescription,
            "image": ogImage,
            "url": canonicalUrl,
            "creator": {
                "@type": "Organization",
                "name": "*MYLG!*",
            },
            "locationCreated": {
                "@type": "Place",
                "name": "Haller 6, Hamburg, Germany",
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Rotherbaum, Hamburg",
                    "addressLocality": "Hamburg",
                    "addressCountry": "Germany",
                },
            },
            "contributor": {
                "@type": "Organization",
                "name": "Mokibaby",
                "role": "Creative Direction",
            },
        };

    const tickerLines = [
        "KEYS SOULCARE HALLER 6 ",
        "DESIGN BY MOKIBABY",
        "DIGITAL ART BY *MYLG!*"
    ];

    const images = [
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/02.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/03.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/04.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/14.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/15.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/16.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/17.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/18.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/19.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/20.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/21.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/22.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/23.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/24.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/25.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/26.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/27.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/28.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/29.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/30.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/31.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/32.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/33.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/34.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/35.jpg"
    ];


    const { opacity } = useData();
    const opacityClass = opacity === 1 ? 'opacity-high' : 'opacity-low';
    const { updateHeaderVisibility } = useScrollContext();
    const [isModalOpen, setModalOpen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);
    const [prevScrollPos, setPrevScrollPos] = useState(0);
  const [svgReady, setSvgReady] = useState(false);


    const isTransitioningRef = useRef(false);

    const nextImage = useCallback(() => {
        if (isTransitioningRef.current) return; // Prevent multiple triggers
        isTransitioningRef.current = true;

        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);

        setTimeout(() => {
            isTransitioningRef.current = false;
        }, 300); // Delay matches the animation duration
    }, [images.length]);

    const prevImage = useCallback(() => {
        if (isTransitioningRef.current) return; // Prevent multiple triggers
        isTransitioningRef.current = true;

        setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);

        setTimeout(() => {
            isTransitioningRef.current = false;
        }, 300); // Delay matches the animation duration
    }, [images.length]);



    const openModal = (index) => {
        setCurrentIndex(index);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
    };


    const handleWindowScroll = useCallback(() => {
        const currentScrollPos = window.scrollY;
        if (currentScrollPos <= 5) {
            updateHeaderVisibility(true);
        } else {
            const isScrollingUp = prevScrollPos > currentScrollPos;
            updateHeaderVisibility(isScrollingUp);
        }
        setPrevScrollPos(currentScrollPos);
    }, [prevScrollPos, updateHeaderVisibility]);

    const handleTouchStart = e => {
        setTouchStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (touchStart === 0 || touchEnd === 0) return;
        const delta = touchStart - touchEnd;
        const swipeThreshold = 50; // Minimum swipe distance in px

        if (Math.abs(delta) > swipeThreshold) {
            if (delta > 0) {
                nextImage();
            } else {
                prevImage();
            }
        }

        setTouchStart(0);
        setTouchEnd(0);
    };

    // Arrow navigation for modal
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "ArrowRight") {
                nextImage();
            } else if (e.key === "ArrowLeft") {
                prevImage();
            } else if (e.key === "Escape") {
                closeModal();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [nextImage, prevImage]);





    // Prevent scrolling when modal is open
    useEffect(() => {
        const preventDefault = (e) => e.preventDefault();

        if (isModalOpen) {
            document.body.classList.add('no-scroll');
            document.addEventListener('touchmove', preventDefault, { passive: false });
        } else {
            document.body.classList.remove('no-scroll');
            document.removeEventListener('touchmove', preventDefault);
        }

        return () => {
            document.body.classList.remove('no-scroll');
            document.removeEventListener('touchmove', preventDefault);
        };
    }, [isModalOpen]);

    // Toggle header visibility based on scroll direction
    useEffect(() => {
        window.addEventListener("scroll", handleWindowScroll);
        return () => window.removeEventListener("scroll", handleWindowScroll);
    }, [handleWindowScroll]);

    // Disable body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = isModalOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isModalOpen]);


    // GSAP animations for SVG and staggered elements
    useEffect(() => {
        if (!svgReady) return;
        const ctx = gsap.context(() => {
            const masterTimeline = gsap.timeline();

            // SVG Path Animation
            masterTimeline.to("#revealPath", {
                attr: {
                    d: "M0,502S175,272,500,272s500,230,500,230V0H0Z"
                },
                duration: 0.75,
                ease: "Power1.easeIn"
            }).to("#revealPath", {
                attr: {
                    d: "M0,2S175,1,500,1s500,1,500,1V0H0Z"
                },
                duration: 0.5,
                ease: "power1.easeOut"
            });

            // Staggered Animations for SVG Elements
            masterTimeline.fromTo('.st1', {
                opacity: 0,
                y: -50
            }, {
                opacity: 1,
                y: 0,
                duration: 0.1,
                stagger: 0.1
            }, "-=0.25");
            masterTimeline.fromTo('.st2', {
                scale: 0
            }, {
                scale: 1,
                duration: 1,
                stagger: 0.1,
                ease: 'elastic.out(1, 0.3)'
            }, "-=0.5");
        });
        return () => ctx.revert(); // Cleanup on component unmount
    }, [svgReady]);



    // Play/pause videos based on visibility using Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target as HTMLVideoElement;
                if (entry.isIntersecting) {
                    video.play();
                } else {
                    video.pause();
                }
            });
        });
        const videos = document.querySelectorAll('video');
        videos.forEach(video => observer.observe(video));
        return () => {
            observer.disconnect(); // Clean up observer
        };
    }, []);





    return (

        <>

        <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={ogImage} />
        <link rel="preconnect" href="https://d1cazymewvlm0k.cloudfront.net" />
        <link rel="dns-prefetch" href="https://d1cazymewvlm0k.cloudfront.net" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>

        <div className={`${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`}>
            <div className="svg-overlay">
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    <path id="revealPath" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"></path>
                </svg>
            </div>


            <div className="workpage-heading">
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keyssoulcare/keyssoulcareheader.svg" onReady={() => setSvgReady(true)} />
            </div>
            <div className="rendering-layout">





                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keyssoulcare/row1.svg" className="rendering-row" />



                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keyssoulcare/row2.svg" className="rendering-row" />
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keyssoulcare/row3.svg" className="rendering-row" />



                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/02.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/03.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(1)} style={{ cursor: "pointer" }} />
                    </div>


                </div>



                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/05.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(2)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/04.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(3)} style={{ cursor: "pointer" }} />
                    </div>



                </div>


                <div className="rendering-row-video">

                    <div className="bb-video-container">
                        <video

                            width="100%"
                            height="100%"
                            loop
                            autoPlay
                            muted
                            playsInline
                        >
                            <source src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/03.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>

                    </div>

                </div>


                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keyssoulcare/row4.svg" className="rendering-row" />



                <div className="grid-container">
                    <div className="column">
                        <div className="top-row content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/06.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(4)} style={{ cursor: "pointer" }} /></div>
                        <div className="bottom-row content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/07.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(5)} style={{ cursor: "pointer" }} /></div>
                    </div>
                    <div className="full-height-column content-item">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/08.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(6)} style={{ cursor: "pointer" }} />
                    </div>
                </div>


                <div className="grid-container second-grid">

                    <div className="full-height-column content-item">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/09.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(7)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="column">
                        <div className="top-row content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/11.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(8)} style={{ cursor: "pointer" }} /></div>
                        <div className="bottom-row content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/10.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(9)} style={{ cursor: "pointer" }} /></div>
                    </div>

                </div>





                <div className="rendering-row-img" style={{ display: 'flex', width: '100%' }}>

                    <div className="img-container" style={{ flex: '1' }}>
                        <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keyssoulcare/row5.svg" className="rendering-row" />
                    </div>

                    <div className="img-container" style={{ flex: '1' }}>
                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/12.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />
                    </div>

                </div>







                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/13.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(11)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/14.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(12)} style={{ cursor: "pointer" }} />
                    </div>



                </div>

                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/15.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(13)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/16.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(14)} style={{ cursor: "pointer" }} />
                    </div>



                </div>



                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/16.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(15)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/17.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(16)} style={{ cursor: "pointer" }} />
                    </div>



                </div>


                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/18.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(17)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/19.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(18)} style={{ cursor: "pointer" }} />
                    </div>



                </div>








                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keyssoulcare/row6.svg" className="rendering-row-svg" />






                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/20.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(19)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/21.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(20)} style={{ cursor: "pointer" }} />
                    </div>




                </div>



                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/22.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(21)} style={{ cursor: "pointer" }} />
                    </div>




                </div>


                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/23.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(22)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/24.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(23)} style={{ cursor: "pointer" }} />
                    </div>




                </div>

                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/25.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(24)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/26.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(25)} style={{ cursor: "pointer" }} />
                    </div>




                </div>

                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/27.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(26)} style={{ cursor: "pointer" }} />
                    </div>





                </div>

                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/28.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(27)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/29.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(28)} style={{ cursor: "pointer" }} />
                    </div>




                </div>

                <div className="rendering-row-img" style={{ display: 'flex', width: '100%' }}>

                    <div className="img-container" style={{ flex: '1' }}>
                        <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/keyssoulcare/row7.svg" className="rendering-row" />
                    </div>

                    <div className="img-container" style={{ flex: '1' }}>
                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/30.jpg" loading="lazy" alt="Keys-Soulcare Image" style={{ width: '100%', height: 'auto' }} />
                    </div>

                </div>

                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/31.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(29)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/32.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(30)} style={{ cursor: "pointer" }} />
                    </div>




                </div>

                <div className="rendering-row-img">


                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/33.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(31)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/34.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(32)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/35.jpg" loading="lazy" alt="Keys Soulcare Image" width="100%" height="100%" onClick={() => openModal(33)} style={{ cursor: "pointer" }} />
                    </div>




                </div>


                <div className="rendering-row-video">

                    <div className="bb-video-container">
                        <video

                            width="100%"
                            height="100%"
                            loop
                            autoPlay
                            muted
                            playsInline
                        >
                            <source src="https://d1cazymewvlm0k.cloudfront.net/19-Keys+Soulcare/00.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>

                    </div>

                </div>














            </div>




            <div className="rendering-ticker-section">

                <Ticker lines={tickerLines}  />
            </div>
            <hr style={{ opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", }} />



            <div className="rendering-layout">






            </div>

            <div className="rendering-infosection">



                <InfoSection />
                <hr style={{ opacity: "1", color: "fff", height: "2px", backgroundColor: "#fff", margin: "0.5rem", }} />

                <div className="single-ticker-section">

                    <SingleTicker />
                </div>
            </div>


            <ReactModal
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                className="modal-content"
                overlayClassName="modal"
                ariaHideApp={false} // Disable for development purposes
            >
                <div
                    className="modal-content"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >

                    <img
                        src={images[currentIndex]}
                        alt={`Image ${currentIndex}`}
                        className="modal-image"
                    />
                </div>
            </ReactModal>




        </div >

        </>

    );
};

export default KeysSoulcare;





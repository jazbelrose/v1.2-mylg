import React, { useEffect, useState, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { gsap } from "gsap";
import "./workpage.css";
import ReactModal from "react-modal";

import { useScrollContext } from "@/app/contexts/useScrollContext";



import Ticker from "../../../shared/ui/ticker";
import Slideshow from "../../../shared/ui/slideShow";
import { InfoSection } from "../../../shared/ui";
import SingleTicker from "../../../shared/ui/singleTicker";
import { useData } from "@/app/contexts/useData";
import InlineSvg from "../../../shared/ui/inlinesvg";

const Elfstudio = () => {



    const pageTitle = "E.L.F. Studio - Large-Scale Event Planning & Production";
    const pageDescription = 
        "Discover the E.L.F. Studio project, a large-scale event planned and produced in Tucson, Arizona. Collaboratively designed with creative director Mokibaby, including CAD plans, venue design, and complete event execution by *MYLG!*.";
    const canonicalUrl = "https://mylg.studio/works/elf-studio";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/19.png";

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "E.L.F. Studio Event Production",
        "description": "Collaborative large-scale event production in Tucson, Arizona, designed by *MYLG!* in partnership with creative director Mokibaby.",
        "image": "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/15.png",
        "url": "https://mylg.studio/works/elf-studio",
        "startDate": "2023-11-15", 
        "endDate": "2023-11-16",   
        "location": {
            "@type": "Place",
            "name": "Tucson, Arizona",
            "address": {
                "@type": "PostalAddress",
                "addressLocality": "Tucson",
                "addressRegion": "AZ",
                "addressCountry": "US"
            }
        },
        "performer": {
            "@type": "Organization",
            "name": "*MYLG!*"
        },
        "organizer": {
            "@type": "Organization",
            "name": "*MYLG!*",
            "url": "https://mylg.studio"
        }
    };
    const tickerLines = [
        "DESIGNED BY MOKIBABY ",
        "E.L.F. STUDIO ",
        "DIGITAL ART BY *MYLG!*"
    ];

    const slides = [
        {
            title: "Step 1 : Venue Planning",
            content: "We start by working with a provided CAD plan or creating one from scratch using floor plans and photos. If no floor plan is available, our team offers a site visit service to map and measure the space for accurate floor plan creation. During this phase, we map out the ground placements for all activation elements, including flooring, furniture, and scenic pieces, ensuring a precise and functional event layout.",
            imageUrl: "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/Slide-01.png",
        },
        {
            title: "Step 2 : CAD Integration and Event Flow",
            content: "In this phase, we refine the CAD plan by incorporating event flow and environmental settings. Lighting design is seamlessly integrated into the layout, setting the tone for the space. This step prepares the design for final styling and fabrication, ensuring every element aligns with the vision and event goals.",
            imageUrl: "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/Slide-02.png",
        },
        {
            title: "Step 3 : Interior Design and Scenic Fabrication",
            content: "This is where creativity takes center stage! Furniture designs are selected and modeled into the environment, scenic fabrication elements are designed and textured, and every detail is thoughtfully placed. Final touches include drapery, bar treatments, props, set dressings, and key signage, all strategically arranged to deliver a fully immersive and visually captivating presentation.",
            imageUrl: "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/Slide-03.png",
        },
    ];

    const images = [
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/03+.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/04.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/05.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/06.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/07.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/08.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/09.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/10.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/11.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/12.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/13.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/14.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/15.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/16.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/17.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/18.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/19.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/20.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/21.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/22.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/23.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/24.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/25.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/26.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/27.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/28.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/29.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/30.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/31.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/32.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/33.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/34.png",
        "https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/35.png",
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



    const openModal = useCallback((index) => {
        setCurrentIndex(index);
        setModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setModalOpen(false);
    }, []);


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
    }, [nextImage, prevImage, closeModal]); 





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
    return () => (document.body.style.overflow = "");
}, [isModalOpen]);


useEffect(() => {
    const ctx = gsap.context(() => {
        const masterTimeline = gsap.timeline();

        // SVG Path Animation
        masterTimeline
            .to("#revealPath", {
                attr: { d: "M0,502S175,272,500,272s500,230,500,230V0H0Z" },
                duration: 0.75,
                ease: "Power1.easeIn"
            })
            .to("#revealPath", {
                attr: { d: "M0,2S175,1,500,1s500,1,500,1V0H0Z" },
                duration: 0.5,
                ease: "power1.easeOut"
            });

        // Staggered Animations for SVG Elements
        masterTimeline.fromTo('.st1', { opacity: 0, y: -50 }, { opacity: 1, y: 0, duration: 0.1, stagger: 0.1 }, "-=0.25");
        masterTimeline.fromTo('.st2', { scale: 0 }, { scale: 1, duration: 1, stagger: 0.1, ease: 'elastic.out(1, 0.3)' }, "-=0.5");

        // Row1 Tile Animations
        const row1Paths = gsap.utils.toArray('.row1-path'); // Select all paths in Row1
        masterTimeline.fromTo(
            row1Paths,
            { opacity: 0, scale: 0 },
            {
                opacity: 1,
                scale: 1,
                duration: 0.8,
                stagger: 0.2,
                ease: 'elastic.out(1, 0.3)',
            },
            "-=0.75" // Start slightly earlier relative to previous animations
        );
    });

    return () => ctx.revert(); // Cleanup on component unmount
    }, [svgReady]);



// Play/pause videos based on visibility using Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                const video = entry.target;
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
        <meta name="twitter:image:alt" content="E.L.F. Studio Project Cover Image" />
        <link rel="preconnect" href="https://d1cazymewvlm0k.cloudfront.net" />
        <link rel="dns-prefetch" href="https://d1cazymewvlm0k.cloudfront.net" />
        <script type="application/ld+json">
            {JSON.stringify(structuredData)}
        </script>
    </Helmet>

        <div className={`${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`}>
            <div className="svg-overlay">
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    <path id="revealPath" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"></path>
                </svg>
            </div>

            
                <div className="workpage-heading">
                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/elf-studio/elf-studio-header.svg" onReady={() => setSvgReady(true)} />
                </div>
                <div className="rendering-layout">
                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/01.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="img-container ">
                        <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/elf-studio/row1.svg" className="rendering-row" />
                    </div>

                    <div className="img-container ">
                        <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/elf-studio/row2.svg" className="rendering-row" style={{ padding: '10px' }} />
                    </div>

                    <div className="img-container yt-container">
                        <a
                            href="https://www.youtube.com/watch?v=KVh0G7ZA13M"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="overlay-container"
                        >
                            <img
                                src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/02.png"
                                alt="elf-studio Video Cover"
                                loading="lazy"
                            />
                            <div className="overlay-text">Watch the Video</div>
                        </a>
                    </div>

                    <div className="rendering-row-img">
                        <Slideshow slides={slides} />
                    </div>

                    <div className="img-container ">
                        <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/elf-studio/row3.svg" className="rendering-row" style={{ padding: '10px' }} />
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/03+.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/04.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(1)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/05.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(2)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/06.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(3)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/07.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(4)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/08.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(5)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/09.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(6)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/10.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(7)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/11.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(8)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/12.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(9)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/13.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>
                </div>

                <div className="rendering-layout">
                    <div className="img-container ">
                        <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/elf-studio/row4.svg" className="rendering-row" style={{ padding: '10px' }} />
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/14.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(11)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/15.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(12)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/16.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(13)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/17.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(14)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/18.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(15)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/19.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(16)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/20.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(17)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/21.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(18)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/22.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(19)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/23.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(20)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/24.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(21)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/25.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(22)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/26.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(23)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/27.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(24)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/28.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(25)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/29.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(26)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/30.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(27)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/31.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(28)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/32.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(29)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/33.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(30)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-row-img">
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/34.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(31)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/47-elf-studio/35.png" loading="lazy" alt="elf-studio Image" width="100%" height="100%" onClick={() => openModal(32)} style={{ cursor: "pointer" }} />
                        </div>
                    </div>

                    <div className="rendering-ticker-section">
                        <Ticker lines={tickerLines} />
                    </div>
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
        
           
            </div>  

            </>
        
    );
};

export default Elfstudio;





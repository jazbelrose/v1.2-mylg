import React, { useRef, useEffect, useState, useCallback } from "react";

import { Helmet } from "react-helmet-async";

import { gsap } from "gsap";
import "./workpage.css";

import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/useScrollContext";

import works from '../works.json';
import BlogPostButton from "../../../shared/ui/blogpostbutton";

import { InfoSection } from "../../../shared/ui";
import SingleTicker from "../../../shared/ui/singleTicker";
import { useData } from "@/app/contexts/useData";
import InlineSvg from "../../../shared/ui/inlinesvg";



const Troia = () => {

    const pageTitle = "The Root Of It All Cannabis Brand | Store Display, Brand Assets & Installation by *MYLG!*";
    const pageDescription =
        "Discover The Root Of It All a premium cannabis brand project by MYLG! Featuring custom store displays, brand assets, render production, and interactive installations.";
    const canonicalUrl = "https://mylg.studio/works/TROIA";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/01.jpg";

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": "The Root Of It All Cannabis Brand",
        "description": "A high-end cannabis brand project including store display, brand assets, render production, and installation by *MYLG!*",
        "image": ogImage,
        "brand": {
            "@type": "Brand",
            "name": "The Root Of It All"
        },
        "manufacturer": {
            "@type": "Organization",
            "name": "*MYLG!*",
            "url": "https://mylg.studio"
        },
        "offers": {
            "@type": "Offer",
            "price": "Contact for pricing",
            "priceCurrency": "USD",
            "url": canonicalUrl,
            "availability": "https://schema.org/InStock"
        }
    };

    const images = [
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/01.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/02.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/03.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/04.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/14.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/15.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/16.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/17.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/18.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/19.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/20.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/21.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/22.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/23.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/24.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/25.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/26.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/27.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/28.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/29.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/30.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/31.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/32.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/36-TROIA/33.jpg"
    ];
    


    const calculateMinValue = () => {
        // Example calculation, adjust as needed
        const vw = window.innerWidth * 0.006;
        return Math.min(10, vw) + 'px';
      };
   
    // Works Gallery
    const worksRefs = useRef<HTMLDivElement[]>([]);
    const [displayedWorks, setDisplayedWorks] = useState([]);
   

    useEffect(() => {
        console.log("Current worksRefs:", worksRefs.current);
    }, [displayedWorks]);

    // Function to shuffle an array
    const shuffleArray = (array) => {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };
    // Shuffle all works and select the first 16
    useEffect(() => {

        const shuffledWorks = shuffleArray(works).slice(0, 16);
        setDisplayedWorks(shuffledWorks);
    }, []);



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
            <meta name="twitter:image:alt" content="TROIA cannabis brand store display" />
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
                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/TROIA/troiaheader.svg" onReady={() => setSvgReady(true)} />
                </div>
                <div className="rendering-layout">






                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/TROIA/row0.svg" className="rendering-row" onReady={() => setSvgReady(true)} />
                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/TROIA/row1.svg" className="rendering-row" />




                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/01.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(0)} />
                        </div>



                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/02.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(1)} />
                        </div>

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/03.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(2)} />
                        </div>

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/04.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(3)} />
                        </div>



                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/05.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(4)} />
                        </div>

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/06.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', cursor: "pointer" }} onClick={() => openModal(5)} />
                        </div>





                    </div>

                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/TROIA/row2.svg" className="rendering-row" />

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/07.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(6)} />
                        </div>



                    </div>





                    <div className="second-grid-gca" style={{ gridTemplateColumns: '0.6fr 0.4fr', columnGap: calculateMinValue(), padding: '0.25vw' }}>


                        <div className="full-height-column-gca" >
                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/08.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', cursor: "pointer" }} onClick={() => openModal(7)} />
                        </div>
                        <div className="column-gca">
                            <div className="top-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/09.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(8)} />
                            </div>
                            <div className="bottom-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/10.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(9)} />
                            </div>
                        </div>



                    </div>



                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/11.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(10)} />
                        </div>




                    </div>


                    <div className="second-grid-gca" style={{ gridTemplateColumns: '0.4fr 0.6fr', columnGap: calculateMinValue(), padding: '0.25vw' }}>

                        <div className="column-gca">
                            <div className="top-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/12.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(11)} />
                            </div>
                            <div className="bottom-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/13.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(12)} />
                            </div>
                        </div>

                        <div className="full-height-column-gca" >
                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/14.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', cursor: "pointer" }} onClick={() => openModal(13)} />
                        </div>

                    </div>


                    <div className="second-grid-gca" style={{ gridTemplateColumns: '0.6fr 0.4fr', columnGap: calculateMinValue(), padding: '0.25vw' }}>


                        <div className="full-height-column-gca" >
                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/15.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%' , cursor: "pointer" }} onClick={() => openModal(14)} />
                        </div>
                        <div className="column-gca">
                            <div className="top-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/16.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(15)} />
                            </div>
                            <div className="bottom-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/17.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(16)} />
                            </div>
                        </div>



                    </div>

                    <div className="second-grid-gca" style={{ gridTemplateColumns: '0.4fr 0.6fr', columnGap: calculateMinValue(), padding: '0.25vw' }}>

                        <div className="column-gca">
                            <div className="top-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/18.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(17)} />
                            </div>
                            <div className="bottom-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/19.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(18)} />
                            </div>
                        </div>

                        <div className="full-height-column-gca" >
                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/20.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', cursor: "pointer" }} onClick={() => openModal(19)} />
                        </div>

                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/21.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(20)} />
                        </div>




                    </div>

                    

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/22.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(21)} />
                        </div>

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/23.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(22)} />
                        </div>

                        



                    </div>

                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/TROIA/row3.svg" className="rendering-row" />


                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/24.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(23)} />
                        </div>

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/25.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(24)} />
                        </div>

                        



                    </div>

                    <div className="second-grid-gca" style={{ gridTemplateColumns: '0.4fr 0.6fr', columnGap: calculateMinValue(), padding: '0.25vw' }}>

                        <div className="column-gca">
                            <div className="top-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/26.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(25)} />
                            </div>
                            <div className="bottom-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/27.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(26)} />
                            </div>
                        </div>

                        <div className="full-height-column-gca" >
                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/28.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', cursor: "pointer" }} onClick={() => openModal(27)} />
                        </div>

                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/29.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(28)} />
                        </div>




                    </div>

                    <div className="second-grid-gca" style={{ gridTemplateColumns: '0.6fr 0.4fr', columnGap: calculateMinValue(), padding: '0.25vw' }}>


                        <div className="full-height-column-gca" >
                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/30.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', cursor: "pointer" }} onClick={() => openModal(29)} />
                        </div>
                        <div className="column-gca">
                            <div className="top-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/31.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(30)} />
                            </div>
                            <div className="bottom-row-gca">
                                <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/32.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '20px', cursor: "pointer" }} onClick={() => openModal(31)} />
                            </div>
                        </div>



                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/36-TROIA/33.jpg" loading="lazy"  alt="TROIA image" style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: "pointer" }} onClick={() => openModal(32)} />
                        </div>




                    </div>




                    
                    




                </div>






                <div className="rendering-layout">






                </div>




                <div className="rendering-layout">

                    <div className="works-titles">

                        {displayedWorks.map((work, index) => (
                            <div className="blog-title-container" key={index} ref={(el) => {
                                if (el && !worksRefs.current.includes(el)) { // Only add if it's a new element
                                    worksRefs.current[index] = el;
                                }
                            }}
                            >



                                <BlogPostButton post={work} />
                            </div>

                        ))}

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

            </div >

            </>
        
    );
};

export default Troia;





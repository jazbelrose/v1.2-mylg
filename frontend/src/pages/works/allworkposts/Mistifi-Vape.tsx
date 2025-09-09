import React, { useRef, useEffect, useState, useCallback, useMemo } from "react";

import { gsap } from "gsap";
import "./workpage.css";
import { Helmet } from "react-helmet-async";

import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/useScrollContext";



import works from '../works.json';
import BlogPostButton from "../../../shared/ui/blogpostbutton";

import { useData } from "@/app/contexts/useData";

interface WorkItem {
    id: number | string;
    slug: string;
    date: string;
    tags: string[];
    title: string;
    subtitle?: string;
    description?: string;
    images: string[];
    readingTime: string;
    authorName: string;
}
import { InfoSection } from "../../../shared/ui";
import SingleTicker from "../../../shared/ui/singleTicker";
import InlineSvg from "../../../shared/ui/inlinesvg";



const MistifiVape = () => {

    const pageTitle = "Mistifi Vape Product Renders, Branding & Store Display Design | MYLG!";
    const pageDescription =
        "Explore our detailed product renders, store display design, and branding for Mistifi Vape. MYLG! specializes in high-quality visual production for premium products.";
    const canonicalUrl = "https://mylg.studio/works/Mistifi-Vape";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/01.jpg";

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": "Mistifi Vape Product Renders and Branding",
        "description": "This project showcases our high-quality product renders, store display concepts, and complete branding for Mistifi Vape, crafted to elevate brand presence.",
        "image": ogImage,
        "creator": {
            "@type": "Organization",
            "name": "*MYLG!*",
            "url": "https://mylg.studio"
        },
        "about": "Product Renders, Branding, Store Display Design"
    };


    const images = useMemo(() => [
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/01.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/02.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/03.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/31.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/32.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/33.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/04.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/14.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/15.jpg"
    ], []);


    // Works Gallery
    const worksRefs = useRef<HTMLDivElement[]>([]);
    const [displayedWorks, setDisplayedWorks] = useState<WorkItem[]>([]);

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
            <meta name="twitter:image:alt" content="Mistifi Vape Product Render" />
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
                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/mistifivape/mistifivapeheader.svg" onReady={() => setSvgReady(true)} />
                </div>
                <div className="rendering-layout">






                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/mistifivape/row0.svg" className="rendering-row" />
                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/mistifivape/row1.svg" className="rendering-row" />





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
                                <source src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/00.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>

                        </div>

                    </div>


                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/01.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/02.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(1)} style={{ cursor: "pointer" }} />
                        </div>



                    </div>



                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/03.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(2)} style={{ cursor: "pointer" }} />
                        </div>




                    </div>
                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/31.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(3)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/32.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(4)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/33.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(5)} style={{ cursor: "pointer" }} />
                        </div>



                    </div>

                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/mistifivape/row12.svg" className="rendering-row" />

                    <div className="rendering-row-img">
                        <div className="img-container">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/04.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(6)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container">
                            <video width="100%" height="auto" loop autoPlay muted playsInline>
                                <source src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/01.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>


                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/05.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(7)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/06.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(8)} style={{ cursor: "pointer" }} />
                        </div>



                    </div>
                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/07.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(9)} style={{ cursor: "pointer" }} />
                        </div>
                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/08.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />
                        </div>



                    </div>





                    <div className="grid-container-gca second-grid-gca" style={{ gridTemplateColumns: '0.4fr 0.6fr', padding: '0.25vw' }}>

                        <div className="full-height-column-gca content-item">
                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/09.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(11)} style={{ cursor: "pointer" }} />
                        </div>

                        <div className="column-gca">
                            <div className="top-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/10.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" onClick={() => openModal(12)} style={{ cursor: "pointer" }} /></div>
                            <div className="bottom-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/11.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" onClick={() => openModal(13)} style={{ cursor: "pointer" }} /></div>
                        </div>



                    </div>

                    <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/mistifivape/row2.svg" className="rendering-row" />





                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/12.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(14)} style={{ cursor: "pointer" }} />
                        </div>




                    </div>

                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/13.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(15)} style={{ cursor: "pointer" }} />
                        </div>




                    </div>
                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/14.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(16)} style={{ cursor: "pointer" }} />
                        </div>




                    </div>
                    <div className="rendering-row-img">

                        <div className="img-container ">


                            <img src="https://d1cazymewvlm0k.cloudfront.net/24-Mistifi+Vape/15.jpg" loading="lazy" alt="Mistifi Vape Image" width="100%" height="100%" onClick={() => openModal(17)} style={{ cursor: "pointer" }} />
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

export default MistifiVape;





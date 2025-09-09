import React, { useEffect, useState, useCallback, useRef } from "react";
import { gsap } from "gsap";
import "./workpage.css";
import { Helmet } from "react-helmet-async";
import ReactModal from "react-modal";
import { useScrollContext } from "../../../app/contexts/useScrollContext";

import { InfoSection } from "../../../shared/ui";
import SingleTicker from "../../../shared/ui/singleTicker";
import { useData } from "@/app/contexts/useData";
import InlineSvg from "../../../shared/ui/inlinesvg";



const TheOscars = () => {

    const pageTitle = "Oscar Fan Experience Production | Immersive Event Design by MYLG!";
    const pageDescription =
        "Explore the Oscar Fan Experience, a fully immersive event production crafted by MYLG! Creative design, branding, and custom installations for a memorable fan engagement.";
    const canonicalUrl = "https://mylg.studio/works/The-Oscars";
    const ogImage = "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/01.jpg";

    const structuredData = {
        "@context": "https://schema.org",
        "@type": "Event",
        "name": "Oscar Fan Experience Production",
        "description": "Immersive fan experience production for the Oscars, featuring creative event design, custom installations, and high-quality branding.",
        "image": ogImage,
        "startDate": "2019-03-10T18:00:00-08:00",
        "endDate": "2019-03-10T23:00:00-08:00",
        "location": {
            "@type": "Place",
            "name": "Dolby Theatre",
            "address": "6801 Hollywood Blvd, Los Angeles, CA 90028, USA"
        },
        "organizer": {
            "@type": "Organization",
            "name": "MYLG!",
            "url": "https://mylg.studio"
        },
        "about": "Event Production, Immersive Experience, Branding"
    };



    const images = [
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/000.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/01.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/02.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/03.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/04.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/14.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/15.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/16.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/17.jpg",
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
            <meta name="twitter:image:alt" content="Oscar Fan Experience" />
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
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/theoscars/theoscarsheader.svg" onReady={() => setSvgReady(true)} />
            </div>
            <div className="rendering-layout">





                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/000.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} />
                    </div>





                </div>

                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/theoscars/row0.svg" className="rendering-row" onReady={() => setSvgReady(true)} />

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/01.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(1)} style={{ cursor: "pointer" }} />
                    </div>




                </div>


                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/02.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(2)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/03.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(3)} style={{ cursor: "pointer" }} />
                    </div>



                </div>



                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/04.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(4)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/05.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(5)} style={{ cursor: "pointer" }} />
                    </div>




                </div>


                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/06.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(6)} style={{ cursor: "pointer" }} />
                    </div>




                </div>

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/07.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(7)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/08.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(8)} style={{ cursor: "pointer" }} />
                    </div>




                </div>









                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/09.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(9)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/10.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />
                    </div>




                </div>


                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/11.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(11)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/12.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(12)} style={{ cursor: "pointer" }} />
                    </div>




                </div>


                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/13.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(13)} style={{ cursor: "pointer" }} />
                    </div>





                </div>

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/14.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(14)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/15.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(15)} style={{ cursor: "pointer" }} />
                    </div>




                </div>
                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/16.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(16)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/29-The+Oscars/17.jpg" loading="lazy" alt="The Oscars image" width="100%" height="100%" onClick={() => openModal(17)} style={{ cursor: "pointer" }} />
                    </div>






                </div>

                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/theoscars/row1.svg" className="rendering-row" />

            </div>

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

export default TheOscars;





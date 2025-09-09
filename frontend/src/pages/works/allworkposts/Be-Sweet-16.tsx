import React, { useRef, useEffect, useState, useCallback } from "react";

import { gsap } from "gsap";
import "./workpage.css";

import ReactModal from "react-modal";

import { Helmet } from "react-helmet-async";
import { useScrollContext } from "@/app/contexts/useScrollContext";

import works from '../works.json';
import BlogPostButton from "../../../shared/ui/blogpostbutton";


import { useData } from "@/app/contexts/useData";


import Ticker from "../../../shared/ui/ticker";
import { InfoSection } from "../../../shared/ui";
import SingleTicker from "../../../shared/ui/singleTicker";
import InlineSvg from "../../../shared/ui/inlinesvg";



const BeSweet16 = () => {

    const images = [
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/02+(2).jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/02.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/03.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/04.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/05.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/06.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/07.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/08.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/09.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/10.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/11.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/12.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/13.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/14.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/15.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/16.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/17.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/18.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/19.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/20.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/21.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/22.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/23.jpg",
        "https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/24.jpg"
    ];



    const tickerLines = [
        "YOU ARE THE CAUSE OF MY EUPHORIA ",
        "YOU DESERVE TO BE HAPPY ",
        "I KNOW WHAT I WANT AND I'M NOT AFRAID TO GO AFTER IT "

    ];


    // Works Gallery
    const worksRefs = useRef([]);
    const [displayedWorks, setDisplayedWorks] = useState<unknown[]>([]);

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


    const nextImage = useCallback(() => {
        let isTransitioning = false;
        if (isTransitioning) return; // Prevent multiple triggers
        isTransitioning = true;

        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);

        setTimeout(() => {
            isTransitioning = false;
        }, 300); // Delay matches the animation duration
    }, [images.length]);

    const prevImage = useCallback(() => {
        let isTransitioning = false;
        if (isTransitioning) return; // Prevent multiple triggers
        isTransitioning = true;

        setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);

        setTimeout(() => {
            isTransitioning = false;
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
    }, [prevScrollPos, handleWindowScroll]);

    // Disable body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = isModalOpen ? "hidden" : "";
        return () => (document.body.style.overflow = "");
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
                <meta name="robots" content="noindex, nofollow" />
                <title>Euphoria Sweet 16 - *MYLG!*</title>
              </Helmet>
        

        <div className={`${opacityClass} ${isModalOpen ? 'no-scroll' : ''}`}>
            
            <div className="svg-overlay">
                <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
                    <path id="revealPath" d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"></path>
                </svg>
            </div>


            <div className="workpage-heading">
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/besweet16/besweet16header.svg" onReady={() => setSvgReady(true)} />
            </div>

            <div className="rendering-layout">






                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/besweet16/row0.svg" className="rendering-row" />
                <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/besweet16/row1.svg" className="rendering-row" />



                <div className="grid-container-gca second-grid-gca" style={{ gridTemplateColumns: '0.3fr 0.7fr', padding: '0.25vw' }}>


                    <div className="column-gca">
                        <div className="top-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/02+(2).jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" onClick={() => openModal(0)} style={{ cursor: "pointer" }} /></div>
                        <div className="bottom-row-gca content-item"> <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/02.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" onClick={() => openModal(1)} style={{ cursor: "pointer" }} /></div>
                    </div>

                    <div className="full-height-column-gca content-item">
                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/03.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(2)} style={{ cursor: "pointer" }} />
                    </div>


                </div>





                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/04.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(3)} style={{ cursor: "pointer" }} />
                    </div>




                </div>


                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/05.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(4)} style={{ cursor: "pointer" }} />
                    </div>
                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/06.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(5)} style={{ cursor: "pointer" }} />
                    </div>



                </div>





                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/07.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(6)} style={{ cursor: "pointer" }} />
                    </div>




                </div>

                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/08.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(7)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/09.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(8)} style={{ cursor: "pointer" }} />
                    </div>




                </div>

            </div>




            <div className="rendering-ticker-section">

                <Ticker lines={tickerLines}  />
            </div>
            





            <div className="rendering-layout">



                <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/10.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(9)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/11.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(10)} style={{ cursor: "pointer" }} />

                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/12.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(11)} style={{ cursor: "pointer" }} />
                    </div>


                </div>   <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/13.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(12)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/14.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(13)} style={{ cursor: "pointer" }} />

                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/15.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(14)} style={{ cursor: "pointer" }} />
                    </div>


                </div>   <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/16.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(15)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/17.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(16)} style={{ cursor: "pointer" }} />

                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/18.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(17)} style={{ cursor: "pointer" }} />
                    </div>


                </div>   <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/19.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(18)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/20.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(19)} style={{ cursor: "pointer" }} />

                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/21.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(20)} style={{ cursor: "pointer" }} />
                    </div>


                </div>   <div className="rendering-row-img">

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/22.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(21)} style={{ cursor: "pointer" }} />
                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/23.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(22)} style={{ cursor: "pointer" }} />

                    </div>

                    <div className="img-container ">


                        <img src="https://d1cazymewvlm0k.cloudfront.net/13-Be+Sweet+16/24.jpg" loading="lazy" alt="Be Sweet 16 Image" width="100%" height="100%" onClick={() => openModal(23)} style={{ cursor: "pointer" }} />
                    </div>


                </div>



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

export default BeSweet16;





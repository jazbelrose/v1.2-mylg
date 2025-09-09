import React, { useEffect, useState, useCallback, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { gsap } from "gsap";
import "./workpage.css";
import ReactModal from "react-modal";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useScrollContext } from "../../../app/contexts/useScrollContext";
import { InfoSection } from "../../../shared/ui";
import SingleTicker from "../../../shared/ui/singleTicker";
import { useData } from "@/app/contexts/useData";
import InlineSvg from "../../../shared/ui/inlinesvg";

gsap.registerPlugin(ScrollTrigger); // Register ScrollTrigger plugin

const PipedDreamEvents = () => {
  const images = [
    "https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/03.png",
    "https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/04.png",
    "https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/05.png",
    "https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/07.png",
    "https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/08.png",
    "https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/09.png",
    "https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/10.png",
  ];

  const { opacity } = useData();
  const opacityClass = opacity === 1 ? "opacity-high" : "opacity-low";
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

    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + images.length) % images.length
    );

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

  const handleTouchStart = (e) => {
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
      document.body.classList.add("no-scroll");
      document.addEventListener("touchmove", preventDefault, {
        passive: false,
      });
    } else {
      document.body.classList.remove("no-scroll");
      document.removeEventListener("touchmove", preventDefault);
    }

    return () => {
      document.body.classList.remove("no-scroll");
      document.removeEventListener("touchmove", preventDefault);
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
      masterTimeline
        .to("#revealPath", {
          attr: {
            d: "M0,502S175,272,500,272s500,230,500,230V0H0Z",
          },
          duration: 0.75,
          ease: "Power1.easeIn",
        })
        .to("#revealPath", {
          attr: {
            d: "M0,2S175,1,500,1s500,1,500,1V0H0Z",
          },
          duration: 0.5,
          ease: "power1.easeOut",
        });

      // Staggered Animations for SVG Elements
      masterTimeline.fromTo(
        ".st1",
        {
          opacity: 0,
          y: -50,
        },
        {
          opacity: 1,
          y: 0,
          duration: 0.1,
          stagger: 0.1,
        },
        "-=0.25"
      );
      masterTimeline.fromTo(
        ".st2",
        {
          scale: 0,
        },
        {
          scale: 1,
          duration: 1,
          stagger: 0.1,
          ease: "elastic.out(1, 0.3)",
        },
        "-=0.5"
      );
    });

    return () => ctx.revert(); // Cleanup on component unmount
    }, [svgReady]);

  // GSAP animation for '.st3'
  useEffect(() => {
    gsap.fromTo(
      ".st3",
      {
        rotation: -45,
        opacity: 0,
        transformOrigin: "center center",
      },
      {
        rotation: 0,
        opacity: 1,
        duration: 0.05, // Faster animation
        stagger: 0.1, // Reduced stagger for quicker effect
        ease: "back.out(1.7)",
        scrollTrigger: {
          trigger: ".st3",
          start: "top 150%", // Adjust trigger threshold as needed
          toggleActions: "play none none none", // Play animation only once
          markers: true, // Debug markers
        },
      }
    );

    gsap.to(".st3", {
      fill: "#ffffff", // Example color
      duration: 0.025, // Faster color change
      stagger: 0.05, // Faster stagger for color change
      ease: "power1.inOut",
      scrollTrigger: {
        trigger: ".st3",
        start: "top 150%", // Adjust trigger threshold as needed
        toggleActions: "play none none none",
        markers: true, // Debug markers
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill()); // Cleanup on component unmount
    };
  }, []);

  // Play/pause videos based on visibility using Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) {
          video.play();
        } else {
          video.pause();
        }
      });
    });
    const videos = document.querySelectorAll("video");
    videos.forEach((video) => observer.observe(video));
    return () => {
      observer.disconnect(); // Clean up observer
    };
  }, []);

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>Pipedream Events - *MYLG!*</title>
      </Helmet>

      <div className={`${opacityClass} ${isModalOpen ? "no-scroll" : ""}`}>
        <div className="svg-overlay">
          <svg viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <path
              id="revealPath"
              d="M0,1005S175,995,500,995s500,5,500,5V0H0Z"
            ></path>
          </svg>
        </div>

        <div className="workpage-heading">
          <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/pipedreamevents/pipedreameventsheader.svg" onReady={() => setSvgReady(true)} />
        </div>
        <div className="rendering-layout">
            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/pipedreamevents/row1.svg" className="rendering-row" onReady={() => setSvgReady(true)} />

            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/pipedreamevents/row2.svg" className="rendering-row" />
            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/pipedreamevents/row3.svg" className="rendering-row" />

          <div className="rendering-row-video">
            <div className="bb-video-container">
              <video
                width="100%"
                height="100%"
                margin-top="1px"
                loop
                autoPlay
                muted
                playsInline
              >
                <source
                  src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/01.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/pipedreamevents/row4.svg" className="rendering-row" />

          <div className="rendering-row-video">
            <div className="bb-video-container">
              <video
                width="100%"
                height="100%"
                margin-top="1px"
                loop
                autoPlay
                muted
                playsInline
              >
                <source
                  src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/02.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div className="rendering-row-img">
            <div className="img-container ">
              <img
                src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/03.png"
                loading="lazy"
                alt="Chevron Image"
                width="100%"
                height="100%"
                onClick={() => openModal(0)}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>

          <div className="rendering-row-img">
            <div className="img-container ">
              <img
                src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/04.png"
                loading="lazy"
                alt="Chevron Image"
                width="100%"
                height="100%"
                onClick={() => openModal(1)}
                style={{ cursor: "pointer" }}
              />
            </div>
            <div className="img-container ">
              <img
                src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/05.png"
                loading="lazy"
                alt="Chevron Image"
                width="100%"
                height="100%"
                onClick={() => openModal(2)}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>

            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/pipedreamevents/row5.svg" className="rendering-row" />

          <div className="rendering-row-video">
            <div className="bb-video-container">
              <video width="100%" height="100%" loop autoPlay muted playsInline>
                <source
                  src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/03.mp4"
                  type="video/mp4"
                />
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div className="rendering-row-img">
            <div className="img-container ">
              <img
                src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/07.png"
                loading="lazy"
                alt="Chevron Image"
                width="100%"
                height="100%"
                onClick={() => openModal(3)}
                style={{ cursor: "pointer" }}
              />
            </div>
            <div className="img-container ">
              <img
                src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/08.png"
                loading="lazy"
                alt="Chevron Image"
                width="100%"
                height="100%"
                onClick={() => openModal(4)}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>

          <div className="rendering-row-img">
            <div className="img-container ">
              <img
                src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/09.png"
                loading="lazy"
                alt="Chevron Image"
                width="100%"
                height="100%"
                onClick={() => openModal(5)}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>

            <InlineSvg src="https://d2qb21tb4meex0.cloudfront.net/svg/pipedreamevents/row6.svg" className="rendering-row" />

          <div className="rendering-row-img">
            <div className="img-container ">
              <img
                src="https://d2qb21tb4meex0.cloudfront.net/31-Pipedream+Events/10.png"
                loading="lazy"
                alt="Chevron Image"
                width="100%"
                height="100%"
                onClick={() => openModal(6)}
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>
        </div>

        <hr
          style={{
            opacity: "1",
            color: "fff",
            height: "2px",
            backgroundColor: "#fff",
            margin: "0.5rem",
          }}
        />

        <div className="rendering-layout"></div>

        <div className="rendering-infosection">
          <InfoSection />
          <hr
            style={{
              opacity: "1",
              color: "fff",
              height: "2px",
              backgroundColor: "#fff",
              margin: "0.5rem",
            }}
          />

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

export default PipedDreamEvents;





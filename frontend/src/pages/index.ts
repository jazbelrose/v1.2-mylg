// index.ts

// Home
export { default as Home } from "./home/home";
import "./home/home.css";

// Terms & Privacy
export { default as TermsAndPrivacy } from "./TermsAndPrivacy/TermsAndPrivacy";
import "./TermsAndPrivacy/TermsAndPrivacy.css";

// Works
export { default as Works } from "./works/showcase";
import "./works/showcase.css";

// Works data
export { default as allBlogPosts } from "./works/allBlogPosts.json";
export { default as worksData } from "./works/works.json";

// Individual WorkPost
export { default as WorkPost } from "./works/workpage/WorkPost";

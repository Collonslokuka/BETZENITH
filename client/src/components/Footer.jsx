import { Link } from 'react-router-dom';
import { FiMail, FiPhone, FiMapPin, FiTwitter, FiFacebook, FiInstagram,
  FiLinkedin, FiYoutube, FiLock } from 'react-icons/fi';
import { FaCcVisa, FaCcMastercard } from 'react-icons/fa';
import { RiBitCoinFill } from 'react-icons/ri';
import { SiEthereum } from 'react-icons/si';
import { useEffect, useRef } from 'react';

export default function Footer() {
  const footerRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            document.body.classList.add('footer-visible');
          } else {
            document.body.classList.remove('footer-visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => {
      if (footerRef.current) {
        observer.unobserve(footerRef.current);
      }
    };
  }, []);

  return (
    <footer
      ref={footerRef}
      className="bg-[#0f1219] border-t border-[#2a3042] mt-8 w-full relative footer-sink"
    >
      <div className="ml-0 lg:ml-64"> {/* Space for left sidebar only on desktop */}
        <div className="max-w-7xl px-4 sm:px-6 py-8 sm:py-12">
          {/* Branding and Concierge Support - Side by Side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8">
            {/* Left Column - BETZENITH and paragraph */}
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
                BET<span className="text-[#00b3b3]">ZENITH</span>
              </h2>
              <p className="text-sm sm:text-base text-gray-400 whitespace-pre-line">
                The pinnacle of luxury sports betting. Experience world-class odds,{'\n'}
                unparalleled security, and a gaming environment designed for the elite.
              </p>
              {/* Social Media Icons */}
              <div className="mt-3">
                <div className="flex flex-wrap gap-3 sm:gap-5">
                  <a href="#" className="text-gray-400 hover:text-[#4267B2] transition-colors">
                    <FiFacebook size={18} />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-[#1DA1F2] transition-colors">
                    <FiTwitter size={18} />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-[#E1306C] transition-colors">
                    <FiInstagram size={18} />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-[#0077B5] transition-colors">
                    <FiLinkedin size={18} />
                  </a>
                  <a href="#" className="text-gray-400 hover:text-[#FF0000] transition-colors">
                    <FiYoutube size={18} />
                  </a>
                </div>
              </div>
            </div>

            {/* Right Column - Concierge Support */}
            <div>
              <h3 className="text-white font-semibold mb-4 text-sm sm:text-base">CONCIERGE SUPPORT</h3>
              {/* EMAIL */}
              <div className="mb-3">
                <div className="flex items-center space-x-2">
                  <FiMail className="text-[#00b3b3]" size={14} />
                  <span className="text-[#00b3b3] text-xs font-medium">EMAIL</span>
                </div>
                <p className="text-gray-400 text-xs ml-7 break-all">vip-support@betzenith.com</p>
              </div>
              {/* PHONE */}
              <div className="mb-3">
                <div className="flex items-center space-x-2">
                  <FiPhone className="text-[#00b3b3]" size={14} />
                  <span className="text-[#00b3b3] text-xs font-medium">PHONE</span>
                </div>
                <p className="text-gray-400 text-xs ml-7">+1 (800) BET-ZENITH</p>
              </div>
              {/* LOCATION */}
              <div>
                <div className="flex items-center space-x-2">
                  <FiMapPin className="text-[#00b3b3]" size={14} />
                  <span className="text-[#00b3b3] text-xs font-medium">LOCATION</span>
                </div>
                <p className="text-gray-400 text-xs ml-7">Grand Plaza, Suite 777</p>
                <p className="text-gray-400 text-xs ml-7">Gibraltar, GX11 1AA</p>
              </div>
            </div>
          </div>

          {/* Divider Line */}
          <div className="border-t border-[#2a3042] my-6 sm:my-10"></div>

          {/* Payment Methods & SSL SECURED & GLOBAL COMPLIANCE */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 py-3">
            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <FaCcVisa className="text-gray-400 text-3xl sm:text-4xl" />
              <FaCcMastercard className="text-gray-400 text-3xl sm:text-4xl" />
              <RiBitCoinFill className="text-gray-400 text-3xl sm:text-4xl" />
              <SiEthereum className="text-gray-400 text-3xl sm:text-4xl" />
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-5">
              <span className="text-gray-400 text-xs font-bold flex items-center">
                <FiLock className="mr-1" size={14} />
                SSL SECURED
              </span>
              <span className="text-gray-400 text-xs font-bold">GLOBAL COMPLIANCE</span>
            </div>
          </div>

          {/* Divider Line */}
          <div className="border-t border-[#2a3042] my-6 sm:my-10"></div>

          {/* TERMS PRIVACY RESPONSIBLE GAMING */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 text-xs text-gray-500">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <Link to="/terms" className="hover:text-[#00b3b3] transition-colors text-[11px]">TERMS</Link>
              <Link to="/privacy" className="hover:text-[#00b3b3] transition-colors text-[11px]">PRIVACY</Link>
              <Link to="/responsible-gaming" className="hover:text-[#00b3b3] transition-colors text-[11px]">RESPONSIBLE GAMING</Link>
              <span className="text-[11px]">© 2026 BETZENITH</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <span className="text-[11px] text-gray-500 border border-[#2a3042] rounded px-2 py-1">18+ ONLY</span>
              <span className="text-[11px] text-gray-500">GAMBLE RESPONSIBLY</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
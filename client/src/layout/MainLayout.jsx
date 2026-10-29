import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import AcademyTheme from '@/components/AcademyTheme'
import DeploymentNotice from '@/components/DeploymentNotice'
import { usesAcademyTheme } from '@/lib/academyTheme'
import React from 'react'
import { Outlet, useLocation, useMatches } from 'react-router-dom'
import BrandedLoader from '@/components/BrandedLoader'

const ScrollToTopOnRouteChange = () => {
  const { pathname, search } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
};

const MainLayout = () => {
  const { pathname } = useLocation();
  const isNotFound = useMatches().some((match) => match.id === "not-found");
  const hideFooter = pathname === "/login";

  return (
    <div className='flex flex-col min-h-screen'>
        <AcademyTheme enabled={isNotFound || usesAcademyTheme(pathname)} />
        <ScrollToTopOnRouteChange />
        <Navbar/>
        <div className='mt-16 min-h-[calc(100svh-4rem)] flex-1'>
            <DeploymentNotice />
            <React.Suspense fallback={<BrandedLoader variant="page" />}><Outlet /></React.Suspense>
        </div>
      {!hideFooter && <Footer />}
    </div>
  )
}

export default MainLayout

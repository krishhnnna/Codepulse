import { useData } from '../context/DataContext';
import ProfileCard from '../components/ProfileCard';
import StatsOverview from '../components/StatsOverview';
import ContestRatingGraph from '../components/ContestRatingGraph';
import SubmissionHeatmap from '../components/SubmissionHeatmap';
import PlatformStats from '../components/PlatformStats';
import TopicStats from '../components/TopicStats';
import UpcomingContests from '../components/UpcomingContests';
import {
  ProfileCardSkeleton,
  StatsOverviewSkeleton,
  HeatmapSkeleton,
  ContestGraphSkeleton,
  PlatformStatsSkeleton,
  TopicStatsSkeleton,
} from '../components/Skeleton';

export default function Profile() {
  const { loading, initialLoad, hasHandles } = useData();

  const showSkeleton = loading && hasHandles && initialLoad;

  return (
    <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left Sidebar */}
        <div className="lg:w-[280px] shrink-0">
          {showSkeleton ? <ProfileCardSkeleton /> : <ProfileCard />}
        </div>

        {/* Center Content */}
        <div className="flex-1 min-w-0 space-y-5">
          {showSkeleton ? <StatsOverviewSkeleton /> : <StatsOverview />}
          {showSkeleton ? <HeatmapSkeleton /> : <SubmissionHeatmap />}
          {showSkeleton ? <ContestGraphSkeleton /> : <ContestRatingGraph />}
          <UpcomingContests />
        </div>

        {/* Right Sidebar */}
        <div className="lg:w-[280px] shrink-0">
          {showSkeleton ? <PlatformStatsSkeleton /> : <PlatformStats />}
          {showSkeleton ? <TopicStatsSkeleton /> : <TopicStats />}
        </div>
      </div>

      <footer className="text-center py-8 mt-6 border-t border-zinc-200 dark:border-zinc-800">
        <p className="text-xs text-zinc-400">
          CodePulse &middot; Coding profile aggregator
        </p>
      </footer>
    </main>
  );
}

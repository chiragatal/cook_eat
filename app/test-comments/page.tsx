import TestComments from '../components/test-comments';
import Navigation from '../components/Navigation';

export default function TestCommentsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Navigation />
        <TestComments />
      </div>
    </div>
  );
}

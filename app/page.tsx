import CreatePost from './components/CreatePost';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Cook & Eat</h1>
        <CreatePost />
      </div>
    </main>
  );
}

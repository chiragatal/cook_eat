const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // Check if user with ID 1 exists
    const user = await prisma.user.findUnique({
      where: { id: 1 }
    });

    if (!user) {
      console.log('User with ID 1 not found. Please run create-user.js first.');
      return;
    }

    // Create a sample recipe
    const recipe = await prisma.post.create({
      data: {
        title: 'Sample Pasta Recipe',
        description: 'A delicious pasta recipe that\'s quick and easy to make.',
        ingredients: JSON.stringify([
          { name: 'Pasta', amount: '250g' },
          { name: 'Tomato Sauce', amount: '1 cup' },
          { name: 'Olive Oil', amount: '2 tbsp' },
          { name: 'Garlic', amount: '2 cloves' },
          { name: 'Basil', amount: 'A handful' }
        ]),
        steps: JSON.stringify([
          { id: '1', instruction: 'Boil the pasta according to package instructions.' },
          { id: '2', instruction: 'Heat olive oil in a pan and add minced garlic.' },
          { id: '3', instruction: 'Add tomato sauce and simmer for 5 minutes.' },
          { id: '4', instruction: 'Drain pasta and mix with the sauce.' },
          { id: '5', instruction: 'Garnish with fresh basil leaves.' }
        ]),
        notes: 'You can add grated Parmesan cheese for extra flavor.',
        images: JSON.stringify(['sample-pasta-image.jpg']),
        tags: JSON.stringify(['quick', 'easy', 'italian']),
        category: 'Pasta',
        cookingTime: 20,
        difficulty: 'Easy',
        isPublic: true,
        userId: user.id
      }
    });

    console.log('Created sample recipe with ID:', recipe.id);
  } catch (error) {
    console.error('Error creating sample recipe:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

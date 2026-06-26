import { PrismaClient, Role, SeatType, ShowSeatStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required to run the seed script.");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // 1. Create Users
  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@movierocks.dev" },
    update: {},
    create: {
      email: "admin@movierocks.dev",
      name: "Admin User",
      password: adminPassword,
      role: Role.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@movierocks.dev" },
    update: {},
    create: {
      email: "user@movierocks.dev",
      name: "John Doe",
      password: userPassword,
      role: Role.USER,
    },
  });

  console.log("Users seeded successfully.");

  // 2. Create Movies
  const movie1 = await prisma.movie.create({
    data: {
      title: "Dune: Part Two",
      description: "Paul Atreides unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the universe, he endeavors to prevent a terrible future only he can foresee.",
      posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800",
      bannerUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200",
      durationMins: 166,
      language: "English",
      genre: "Sci-Fi, Adventure",
      releaseDate: new Date("2024-03-01"),
      rating: 8.9,
    },
  });

  const movie2 = await prisma.movie.create({
    data: {
      title: "Spider-Man: Across the Spider-Verse",
      description: "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash on how to handle a new threat, Miles must redefine what it means to be a hero.",
      posterUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?q=80&w=800",
      bannerUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=1200",
      durationMins: 140,
      language: "English",
      genre: "Action, Sci-Fi",
      releaseDate: new Date("2023-06-02"),
      rating: 9.1,
    },
  });

  const movie3 = await prisma.movie.create({
    data: {
      title: "Oppenheimer",
      description: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
      posterUrl: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=800",
      bannerUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200",
      durationMins: 180,
      language: "English",
      genre: "Drama, Biography",
      releaseDate: new Date("2023-07-21"),
      rating: 8.8,
    },
  });

  console.log("Movies seeded successfully.");

  // 3. Create Theatre, Screen, and Seats
  const theatre = await prisma.theatre.create({
    data: {
      name: "PVR ICON Versova",
      city: "Mumbai",
      address: "Laxmi Industrial Estate, Link Rd, Andheri West",
    },
  });

  const screen = await prisma.screen.create({
    data: {
      name: "Audi 1",
      theatreId: theatre.id,
    },
  });

  // Create standard seat layout grid (Rows A-E, Numbers 1-8 = 40 seats)
  const rows = ["A", "B", "C", "D", "E"];
  const seats = [];

  for (const row of rows) {
    for (let num = 1; num <= 8; num++) {
      const type = (row === "A" || row === "B") ? SeatType.PREMIUM : SeatType.NORMAL;
      const seat = await prisma.seat.create({
        data: {
          screenId: screen.id,
          row,
          number: num,
          type,
        },
      });
      seats.push(seat);
    }
  }

  console.log("Theatre layout and seats generated successfully.");

  // 4. Create Shows & ShowSeats
  const moviesList = [movie1, movie2, movie3];
  const basePrice = 12.00;

  for (let dayOffset = 0; dayOffset < 3; dayOffset++) {
    const showDate = new Date();
    showDate.setDate(showDate.getDate() + dayOffset);

    // Schedule 1 show per movie per day
    for (let index = 0; index < moviesList.length; index++) {
      const movie = moviesList[index];
      
      // Hour spacing: 14:00, 17:30, 21:00
      const hour = index === 0 ? 14 : index === 1 ? 17 : 21;
      const minute = index === 1 ? 30 : 0;
      
      const startTime = new Date(showDate);
      startTime.setHours(hour, minute, 0, 0);

      const endTime = new Date(startTime.getTime() + movie.durationMins * 60 * 1000);

      const show = await prisma.show.create({
        data: {
          movieId: movie.id,
          screenId: screen.id,
          startTime,
          endTime,
          basePrice,
        },
      });

      // Insert ShowSeat mappings for each seat
      const showSeatsData = seats.map((seat) => {
        let priceMultiplier = 1.0;
        if (seat.type === SeatType.PREMIUM) priceMultiplier = 1.2;

        return {
          showId: show.id,
          seatId: seat.id,
          status: ShowSeatStatus.AVAILABLE,
          price: basePrice * priceMultiplier,
        };
      });

      await prisma.showSeat.createMany({
        data: showSeatsData,
      });
    }
  }

  console.log("Shows and ShowSeats generated successfully.");
  console.log("Seeding completed successfully! 🎉");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });

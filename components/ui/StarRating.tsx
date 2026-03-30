interface StarRatingProps {
  rating: number;
  max?: number;
}

export default function StarRating({ rating, max = 5 }: StarRatingProps) {
  return (
    <span className="inline-flex">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < rating ? "star-filled" : "star-empty"}>
          ★
        </span>
      ))}
    </span>
  );
}

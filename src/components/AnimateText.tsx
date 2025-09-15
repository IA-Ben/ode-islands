
interface AnimateTextProps {
  children: string;
  delay?: number;
  active?: boolean;
}

const AnimateText: React.FC<AnimateTextProps> = ({
  children,
  delay,
  active,
}) => {
  if (!children || children.length < 1) return null;

  const textArray = children.split(" ");

  return (
    <>
      {textArray.map((chunk, index) => (
        <span
          key={index}
          style={{
            opacity: 0,
            animationName: active ? "animTextIn" : "none",
            animationDuration: "300ms",
            animationFillMode: "forwards",
            animationDelay: active ? `${(delay || 0) + index * 100}ms` : "0ms",
          }}
        >
          {`${chunk} `}
        </span>
      ))}
    </>
  );
};

export default AnimateText;

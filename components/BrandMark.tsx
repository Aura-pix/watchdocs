import Image from "next/image";

export default function BrandMark() {
  return (
    <>
      <Image
        src="/mark.svg"
        alt=""
        width={28}
        height={28}
        className="dark:hidden"
      />
      <Image
        src="/mark-dark.svg"
        alt=""
        width={28}
        height={28}
        className="hidden dark:block"
      />
    </>
  );
}

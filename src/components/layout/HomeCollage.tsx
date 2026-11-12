// Archival photographs pinned above the home headline. All four are public
// domain and served locally from public/archive (see CREDITS.md there).
const photo = (name: string) => `${import.meta.env.BASE_URL}archive/${name}`;

export function HomeCollage() {
  return <div className="collage" aria-hidden="true">
    <figure className="piece piece-bug">
      <span className="tape tape-top" />
      <div className="piece-round"><img src={photo('first-bug.jpg')} alt="" /></div>
      <figcaption className="label label-bug">First actual bug, 1947</figcaption>
    </figure>

    <figure className="piece piece-paper">
      <img src={photo('perceptron.jpg')} alt="" />
      <p>Fig. 2 · Mark I Perceptron</p>
    </figure>

    <figure className="piece piece-eniac">
      <img src={photo('eniac.jpg')} alt="" />
    </figure>

    <figure className="piece piece-apollo">
      <span className="tape tape-corner" />
      <img src={photo('hamilton.jpg')} alt="" />
      <figcaption className="label label-apollo">Apollo guidance code, 1969</figcaption>
    </figure>
  </div>;
}

// The small photograph set inline with the headline words.
export function HeadlineChip() {
  return <span className="headline-chip" aria-hidden="true"><img src={photo('eniac.jpg')} alt="" /></span>;
}

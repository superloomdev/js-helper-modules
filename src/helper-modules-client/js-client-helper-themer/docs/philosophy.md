# Philosophy: Why Themer Exists

Themer answers one question: how does an application get a complete, consistent set of design decisions onto the screen, on more than one platform, without hand-maintaining a value for every token on every platform.

The answers below are the reasoning behind the API. For the contracts themselves see [Schemas](schemas.md); for authoring see [Template Reference](template.md).

## On This Page

- [1. A Theme Is Derived, Not Enumerated](#1-a-theme-is-derived-not-enumerated)
- [2. One Resolution, Two Projections](#2-one-resolution-two-projections)
- [3. Nothing Disappears Quietly](#3-nothing-disappears-quietly)
- [4. Layers Instead of Modes](#4-layers-instead-of-modes)
- [5. Fonts: The One Thing This Module Does Not Do](#5-fonts-the-one-thing-this-module-does-not-do)
- [6. A Pure Engine Throws](#6-a-pure-engine-throws)
- [See Also](#see-also)

---

## 1. A Theme Is Derived, Not Enumerated

A design system has on the order of a hundred semantic tokens. Writing all of them out for every theme is the obvious approach and the wrong one: each new theme is another hundred values to keep in step, and a drift between two themes is invisible until someone notices the wrong grey on one screen.

Themer treats a theme as a **derivation**. A template declares what tokens exist and how each one is produced; a theme supplies the handful of values that actually differ. A theme that pins four seeds and a theme that pins every value are the same object on the same code path.

The engine deliberately does not decide which of those you should write. A design system with hand-tuned values is not a system doing it wrong: a color chosen by eye against a specific background is a real decision that no positional rule reproduces. Pinning it is the correct encoding, and the engine treats a pin as a first-class route rather than an escape hatch.

## 2. One Resolution, Two Projections

The costly mistake in cross-platform theming is maintaining two themes. They start identical and drift, and the drift shows up as a spacing that is right on web and wrong on a phone.

Themer splits the work in two:

- **Resolve** produces canonical, unit-free values. A spacing token is the number `16`, not `'1rem'` and not `16`-with-an-implied-unit.
- **Emit** projects those values onto one platform. Web wants `'1rem'` and a `box-shadow` string; React Native wants `16` and a style object.

One derivation, two projections. There is no second theme to keep in step, and the difference between the platforms lives in one table rather than scattered through the token values.

This is also why a type set resolves to an **object** rather than to separate sibling tokens. React Native needs an absolute line height, which is the font size multiplied by the ratio. If size and ratio were separate tokens, emit would have to reach across tokens to compute it. Because the type set is one object, everything the projection needs is already in hand.

## 3. Nothing Disappears Quietly

Some facts cannot cross a platform boundary. A CSS shadow can have a spread radius and many layers; React Native supports neither. The tempting behavior is to drop what does not fit.

The cautionary example is in the platform bridge itself: `react-native-web` lists `elevation` among its ignored properties and discards it with no warning. A value vanishes, the screen looks subtly wrong, and nothing anywhere says why.

Themer reports instead. Every emit returns two lists beside the tokens:

- **`substituted`** names a token the platform cannot carry at all, along with the fallback that replaced it.
- **`lossy`** names a fact a projection could not represent, which token lost it, and why.

Both are ordinary return values, not warnings, so a build tool can fail on them and a runtime can ignore them. The engine does not decide which; it makes the information available.

The same principle applies before emit: a token metadata entry that names a group no emitter table recognizes is a build-time `TypeError` naming every offending token, not a silent pass-through that leaves the value unprojected.

## 4. Layers Instead of Modes

Dark mode, high density, reduced motion, and a tenant's brand are usually implemented as separate themes or as branches inside the theme. Both approaches multiply: four independent switches are sixteen combinations to author.

Themer applies an ordered stack of sparse **layers**. Each layer pins only what it changes, and the last layer to touch a token wins. Dark mode is a layer, density is a layer, a tenant's brand is a layer, and they compose without anyone enumerating the combinations.

Reduced motion follows the same idea taken one step further: it is a derivation over the durations a theme already has, not a second set of durations. A layer sets `motion_factor`, and every token in the duration group scales.

## 5. Fonts: The One Thing This Module Does Not Do

Themer decides which typeface a piece of text should use. It does **not** load that typeface, and it never learns whether the load succeeded.

A type set carries a font family **token**, such as `'mono'`. The engine passes that token through resolution and both emitters without translating it. It has no font registry, performs no I/O, and holds no state, so it could not resolve the token to a real family name even if it wanted to.

Three reasons this boundary sits where it does:

- **The engine has nothing to resolve with.** Mapping a token to a registered family name requires the registry, which belongs to the module that owns font loading.
- **React Native accepts one family, not a fallback list.** A CSS-style font stack is not representable on native at all, so emitting one would produce a value one platform cannot use.
- **Loading is asynchronous and theming is not.** Coupling them would make the theme wait on a network fetch.

**The two modules do not depend on each other.** `helper-themer` does not require `helper-font`, and `helper-font` does not require `helper-themer`. Neither appears in the other's peer dependencies. An application can use either alone.

**Theming never waits for fonts.** Resolution and emit are synchronous and do no I/O, so a theme is ready in the same tick the host asks for it. Text renders immediately in whatever family is available, and swaps when the font module finishes its own work. Sequencing the two, by loading fonts and then theming, reintroduces exactly the blocking startup this design avoids.

The single point of contact is **name equality**: the family a font module registers must be the name that the token in the theme resolves to. Nothing else connects them, and getting that name wrong is the common failure in this space, so it is worth checking deliberately rather than assuming.

## 6. A Pure Engine Throws

Most modules in this framework return an envelope for failures, because most modules do I/O and I/O fails even when the calling code is perfect.

Themer does no I/O. Every failure it can produce is the caller passing something wrong: a template with no token map, an alias pointing at nothing, a platform name that does not exist. There is no world-is-broken case, so there is nothing to report through an envelope, and the module throws instead.

This has a consequence worth stating plainly. A theme document arriving from a server is untrusted input, and handing a malformed one straight to the engine throws. That check belongs to the layer that fetched it, because that layer is the one with a real operational failure to report.

There is exactly one exception, and it proves the rule rather than weakening it. `validateTemplate` returns `{ success, errors }` instead of throwing, because it is the function you call **before** the template is in use, when the document is under review. A reviewer wants every finding at once; raising the first one makes checking a theme package an iterative guessing game. That is a reporting surface, not an operational envelope, and it is the same distinction that gives contrast enforcement a `report` mode alongside `correct`. Once a template reaches `resolve`, the review is over and a defect is a caller bug again.

## See Also

- [API Reference](api.md) - every function, its arguments, and its return shape
- [Schemas](schemas.md) - the validated contracts at the boundary
- [Template Reference](template.md) - authoring a template
- [Configuration](configuration.md) - config keys and the loader pattern

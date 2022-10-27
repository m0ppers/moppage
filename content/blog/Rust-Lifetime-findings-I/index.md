+++
title = "Rust Lifetime findings I"
date = 2017-10-20
[taxonomies]
tags = ["rust",
  "lifetimes",
  "wurst"]
+++

So somebody once said that you should not hesitate to post things you think would be n00bish but others might simply struggle with the same problems so it is helpful anyway. While I couldn't agree more it is still a step to really do it.<!-- more -->

Writing it down will hopefully also help me getting better at it.

I am currently focussing more and more on rust (this time for real!). In my current project I somehow managed to avoid them altogether so far but suddenly I saw it again:

```
^ expected lifetime parameter
```

So once again I read through the lifetime chapter. I always think I understand the concept and think it is super awesome but I just fail at implementation. And here again. I failed. I have a main struct which should own most of the things. One of the members would be an optional member that should borrow one of the other members for a time. I know that the main struct will outlive every member.

So a stupid example (without lifetimes for now):

```
struct Sauce {
}

struct Wurst {
    sauce: &Sauce,
}

struct Meal {
    wurst: Option<Wurst>,
    sauce: Sauce,
}

impl Meal {
    pub fn wurstify(&mut self) {
        self.wurst = Some(Wurst { sauce: &self.sauce})
    }
}

fn main() {
    let mut meal = Meal {
        wurst: None,
        sauce: Sauce {},
    };
    meal.wurstify();
}
```

Obviously an artificial example because why should `Wurst` be optional in a `Meal` - but whatever.

When calling `wurstify()` the `Wurst` should be created and be able to access the `Sauce`.

As we are borrowing something we need a lifetime specifier for `Sauce` in `Wurst` like so:

```
struct Wurst<'a> {
    sauce: &'a Sauce,
}
```

Now comes my understanding of it (**BEWARE** - might be totally wrong)

Line by line:

```
struct Wurst<'a>
```

This just declares a lifetime specifier. It does not do anything special except for the declaration.

```
sauce: &'a Sauce,
```

This uses `'a` and says: `sauce` has the lifetime of `'a`. We could use `'a` for more members here to indicate that
they share a common lifetime.

Now to using it:

```
struct Meal<'a> {
    wurst: Option<Wurst<'a>>,
    sauce: Sauce,
}
```

This also declares a lifetime `'a` for the `Meal` and uses it for `Wurst`. So far so good. `'a` can also be `'b` or whatever.
The name need not be the `'a` we used `Wurst`. Even when using a different specifier they still mean the same thing, namely that `Wurst` has some lifetime but the name of the lifetime specifier is arbitrary.
Much like we can fiddle with variable names:

```
fn test(b: u8) {
    ...
}

let a = 1u8;
test(a);
```

Now comes the part where I was stuck for a while. Let's go through here step by step.

```
impl Meal {
    pub fn wurstify(&mut self) {
        self.wurst = Some(Wurst { sauce: &self.sauce})
    }
}
```

First the compiler will remind us that the `impl Meal` needs some lifetime (because the struct has been declared with one).

That is easy to fix:

```
impl<'a> Meal<'a> {
```

Again we are declaring a lifetime specifier (immediately after impl) and then use it (right after `Meal`).
Having fixed that the compiler is completly going wild:

```
error[E0495]: cannot infer an appropriate lifetime for borrow expression due to conflicting requirements
  --> src/main.rs:15:42
   |
15 |         self.wurst = Some(Wurst { sauce: &self.sauce})
   |                                          ^^^^^^^^^^^
   |
note: first, the lifetime cannot outlive the anonymous lifetime #1 defined on the body at 14:31...
  --> src/main.rs:14:32
   |
14 |       pub fn wurstify(&mut self) {
   |  ________________________________^
15 | |         self.wurst = Some(Wurst { sauce: &self.sauce})
16 | |     }
   | |_____^
note: ...so that reference does not outlive borrowed content
  --> src/main.rs:15:42
   |
15 |         self.wurst = Some(Wurst { sauce: &self.sauce})
   |                                          ^^^^^^^^^^^
note: but, the lifetime must be valid for the lifetime 'a as defined on the body at 14:31...
  --> src/main.rs:14:32
   |
14 |       pub fn wurstify(&mut self) {
   |  ________________________________^
15 | |         self.wurst = Some(Wurst { sauce: &self.sauce})
16 | |     }
   | |_____^
note: ...so that expression is assignable (expected std::option::Option<Wurst<'a>>, found std::option::Option<Wurst<'_>>)
  --> src/main.rs:15:22
   |
15 |         self.wurst = Some(Wurst { sauce: &self.sauce})
   |                      ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

error: aborting due to previous error
```

So that left me head-scratching for a while. Everything was (to my knowledge) well defined on the struct and it was still complaining. Somehow rust still couldn't figure out that `Meal` would live longer. I tried everything to set some lifetime when creating the `Wurst` but nothing helped. In fact I was messing at the wrong place.

To actually let rust know about the lifetime of a reference you need to specify the lifetime where it is actually created and not where it is used. This might seem trivial (even to my later self) but I just couldn't get my mind around it at that time :)

So the solution was:

```
impl<'a> Meal<'a> {
    pub fn wurstify(&'a mut self) {
        self.wurst = Some(Wurst { sauce: &self.sauce})
    }
}
```

And here is the full code:

```
struct Sauce {
}

struct Wurst<'a> {
    sauce: &'a Sauce,
}

struct Meal<'a> {
    wurst: Option<Wurst<'a>>,
    sauce: Sauce,
}

impl<'a> Meal<'a> {
    pub fn wurstify(&'a mut self) {
        self.wurst = Some(Wurst { sauce: &self.sauce})
    }
}

fn main() {
    let mut meal = Meal {
        wurst: None,
        sauce: Sauce {},
    };
    meal.wurstify();
}
```

Happy Wursting and Rusting.

/* Lavish — site behaviour.
   Runs after partials are injected (see include.js -> 'lv:partials-loaded'). */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------
     Announcement ticker
     Figma draws prev/next arrows, so the bar rotates its slides.
     --------------------------------------------------------- */
  function initAnnounce(root) {
    root.querySelectorAll('.lv-announce').forEach(function (bar) {
      var items = Array.prototype.slice.call(bar.querySelectorAll('.lv-announce__item'));
      if (items.length < 2) return;
      var i = 0;

      function show(next) {
        items[i].classList.remove('is-active');
        i = (next + items.length) % items.length;
        items[i].classList.add('is-active');
      }

      bar.querySelectorAll('[data-announce]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          show(i + (btn.dataset.announce === 'next' ? 1 : -1));
          restart();
        });
      });

      var timer;
      function restart() {
        if (reduce) return;
        clearInterval(timer);
        timer = setInterval(function () { show(i + 1); }, 6000);
      }
      // hold the rotation while it is being read or operated
      bar.addEventListener('mouseenter', function () { clearInterval(timer); });
      bar.addEventListener('focusin', function () { clearInterval(timer); });
      bar.addEventListener('mouseleave', restart);
      bar.addEventListener('focusout', restart);
      restart();
    });
  }

  /* ---------------------------------------------------------
     Desktop dropdowns (derived — none exist in the Figma file)
     --------------------------------------------------------- */
  function initDropdowns(root) {
    var open = null;
    var timer = null;

    function close(dd) {
      if (!dd) return;
      dd.classList.remove('is-open');
      var btn = dd.querySelector('.lv-nav__link');
      var panel = dd.querySelector('.lv-dropdown');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (panel) setTimeout(function () {
        if (!dd.classList.contains('is-open')) panel.hidden = true;
      }, 200);
      if (open === dd) open = null;
    }

    function openDropdown(dd) {
      if (!dd) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (open && open !== dd) close(open);
      var btn = dd.querySelector('.lv-nav__link');
      var panel = dd.querySelector('.lv-dropdown');
      if (!btn || !panel) return;
      panel.hidden = false;
      void panel.offsetHeight;
      dd.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      open = dd;
    }

    root.querySelectorAll('[data-dropdown]').forEach(function (dd) {
      var btn = dd.querySelector('.lv-nav__link');
      var panel = dd.querySelector('.lv-dropdown');
      if (!btn || !panel) return;

      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var isOpen = dd.classList.contains('is-open');
        if (isOpen) {
          close(dd);
        } else {
          openDropdown(dd);
        }
      });

      dd.addEventListener('mouseenter', function () {
        openDropdown(dd);
      });

      dd.addEventListener('mouseleave', function () {
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
          close(dd);
        }, 250);
      });
    });

    document.addEventListener('click', function (e) {
      if (open && !open.contains(e.target)) {
        close(open);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close(open);
    });
  }

  /* ---------------------------------------------------------
     Mobile drawer.
     Built from the header's own nav groups so each header variant
     gets the right links with no duplicated markup.
     Derived UI — see docs/STATES-DERIVED.md
     --------------------------------------------------------- */
  function initDrawer(root) {
    var header = root.querySelector('[data-lv-header]');
    var burger = root.querySelector('[data-menu-open]');
    if (!header || !burger || document.getElementById('lv-drawer')) return;

    var drawer = document.createElement('div');
    drawer.className = 'lv-drawer';
    drawer.id = 'lv-drawer';
    drawer.hidden = true;
    drawer.innerHTML =
      '<div class="lv-drawer__head">' +
      '  <span class="lv-drawer__brand">Lavish Laser MedSpa</span>' +
      '  <button class="lv-drawer__close" type="button" data-menu-close aria-label="Close menu">&times;</button>' +
      '</div>' +
      '<nav class="lv-drawer__nav" aria-label="Mobile"><ul class="lv-drawer__list"></ul></nav>';

    var list = drawer.querySelector('.lv-drawer__list');

    header.querySelectorAll('.lv-nav__group > .lv-nav__item').forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'lv-drawer__item';

      var cta = item.querySelector('.lv-btn:not(.lv-dropdown__all)');
      if (cta) {
        li.className += ' lv-drawer__item--cta';
        li.appendChild(cta.cloneNode(true));
        list.appendChild(li);
        return;
      }

      var panel = item.querySelector('.lv-dropdown');
      var label = item.querySelector('.lv-nav__link');
      if (!label) return;

      if (panel) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lv-drawer__link lv-drawer__link--toggle';
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = label.textContent.trim();
        var sub = document.createElement('div');
        sub.className = 'lv-drawer__sub';
        sub.hidden = true;
        var clone = panel.cloneNode(true);
        clone.querySelectorAll('.lv-mega__sub, .lv-icon--mega-chev').forEach(function (n) { n.remove(); });
        clone.querySelectorAll('.lv-dropdown__all').forEach(function (a) {
          a.className = 'lv-dropdown__all';
          var c = a.querySelector('.lv-circle'); if (c) c.remove();
        });
        sub.innerHTML = clone.innerHTML;
        btn.addEventListener('click', function () {
          var openNow = !sub.hidden;
          sub.hidden = openNow;
          btn.setAttribute('aria-expanded', String(!openNow));
          btn.classList.toggle('is-open', !openNow);
        });
        li.appendChild(btn);
        li.appendChild(sub);
      } else {
        var a = document.createElement('a');
        a.className = 'lv-drawer__link';
        a.href = label.getAttribute('href') || '#';
        a.textContent = label.textContent.trim();
        li.appendChild(a);
      }
      list.appendChild(li);
    });

    document.body.appendChild(drawer);

    function setOpen(state) {
      // unhide, force a reflow so the opening transition has a start frame,
      // then flip the class — rAF is throttled when the tab is not painting
      if (state) {
        drawer.hidden = false;
        void drawer.offsetHeight;
      }
      document.body.classList.toggle('lv-no-scroll', state);
      drawer.classList.toggle('is-open', state);
      burger.setAttribute('aria-expanded', String(state));
      if (!state) setTimeout(function () {
        if (!drawer.classList.contains('is-open')) drawer.hidden = true;
      }, 300);
    }

    burger.addEventListener('click', function () { setOpen(true); });
    drawer.addEventListener('click', function (e) {
      if (e.target.closest('[data-menu-close]') || e.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) setOpen(false);
    });
  }

  /* ---------------------------------------------------------
     Scroll reveal — derived house motion, see docs/MOTION.md
     --------------------------------------------------------- */
  function initReveal(root) {
    var targets = root.querySelectorAll('.lv-reveal');
    if (!targets.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     Accordions (FAQ and anywhere else the comps show one)
     --------------------------------------------------------- */
  function initAccordions(root) {
    root.querySelectorAll('[data-accordion]').forEach(function (acc) {
      var triggers = acc.querySelectorAll('[data-accordion-trigger], .lv-faq__trigger');
      triggers.forEach(function (btn) {
        var panel = document.getElementById(btn.getAttribute('aria-controls'));
        var item = btn.closest('.lv-acc__item, .lv-faq__item');
        if (!panel || !item) return;

        btn.addEventListener('click', function () {
          var isOpen = item.classList.contains('is-open') || btn.getAttribute('aria-expanded') === 'true';
          triggers.forEach(function (other) {
            if (other === btn) return;
            other.setAttribute('aria-expanded', 'false');
            var otherItem = other.closest('.lv-acc__item, .lv-faq__item');
            if (otherItem) {
              otherItem.classList.remove('is-open');
              var otherPanel = document.getElementById(other.getAttribute('aria-controls'));
              if (otherPanel) otherPanel.setAttribute('hidden', '');
            }
          });
          btn.setAttribute('aria-expanded', String(!isOpen));
          item.classList.toggle('is-open', !isOpen);
          if (!isOpen) {
            panel.removeAttribute('hidden');
          } else {
            panel.setAttribute('hidden', '');
          }
        });
      });
    });
  }

  /* ---------------------------------------------------------
     Newsletter / contact forms — validate, never submit.
     WP phase wires the real endpoint.
     --------------------------------------------------------- */
  function initForms(root) {
    root.querySelectorAll('form[data-wp-form]').forEach(function (form) {
      form.setAttribute('novalidate', '');

      var fields = Array.prototype.slice.call(
        form.querySelectorAll('input, textarea, select'));

      // a bot trap: a real person never fills a field they cannot see
      var trap = document.createElement('input');
      trap.type = 'text';
      trap.name = 'lv_website';
      trap.tabIndex = -1;
      trap.autocomplete = 'off';
      trap.setAttribute('aria-hidden', 'true');
      trap.className = 'lv-visually-hidden';
      form.appendChild(trap);

      function message(field) {
        if (field.validity.valueMissing) return 'This field is required.';
        if (field.validity.typeMismatch && field.type === 'email') {
          return 'Enter a valid email address.';
        }
        if (field.validity.typeMismatch && field.type === 'tel') {
          return 'Enter a valid phone number.';
        }
        if (field.validity.tooShort) {
          return 'Use at least ' + field.minLength + ' characters.';
        }
        return field.validationMessage || 'Check this field.';
      }

      function errorNode(field) {
        var id = (field.id || field.name) + '-err';
        var node = form.querySelector('#' + CSS.escape(id));
        if (!node) {
          node = document.createElement('span');
          node.className = 'lv-field-error';
          node.id = id;
          // sits after the control, inside its wrapper where there is one
          (field.closest('.lv-field-wrap') || field.parentNode)
            .insertBefore(node, field.nextSibling);
        }
        return node;
      }

      function mark(field, valid) {
        var node = errorNode(field);
        field.classList.toggle('is-invalid', !valid);
        field.setAttribute('aria-invalid', String(!valid));
        node.textContent = valid ? '' : message(field);
        if (valid) field.removeAttribute('aria-describedby');
        else field.setAttribute('aria-describedby', node.id);
      }

      fields.forEach(function (field) {
        // validate on blur, then live once it has been flagged, so the first
        // keystroke is never scolded
        field.addEventListener('blur', function () {
          if (field.value !== '' || field.classList.contains('is-invalid')) {
            mark(field, field.checkValidity());
          }
        });
        field.addEventListener('input', function () {
          form.classList.remove('is-sent', 'is-failed');
          if (field.classList.contains('is-invalid')) {
            mark(field, field.checkValidity());
          }
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (form.classList.contains('is-sending')) return;

        var firstBad = null;
        fields.forEach(function (field) {
          var valid = field.checkValidity();
          mark(field, valid);
          if (!valid && !firstBad) firstBad = field;
        });
        if (firstBad) {
          firstBad.focus();
          return;
        }
        if (trap.value) return;                 // silently drop bots

        form.classList.remove('is-sent', 'is-failed');
        form.classList.add('is-sending');

        // WP phase replaces this with the real endpoint; the states around it
        // are what the theme needs to keep.
        send(form).then(function () {
          form.classList.remove('is-sending');
          form.classList.add('is-sent');
          form.reset();
          var ok = form.querySelector('.lv-form__success');
          if (ok) ok.focus();
        }, function () {
          form.classList.remove('is-sending');
          form.classList.add('is-failed');
        });
      });
    });
  }

  function send(form) {
    var url = form.getAttribute('action');
    if (!url) {
      // no endpoint wired yet: resolve on the next tick so the sending state
      // is still exercised
      return new Promise(function (resolve) { setTimeout(resolve, 600); });
    }
    return fetch(url, { method: 'POST', body: new FormData(form) })
      .then(function (r) { if (!r.ok) throw new Error(r.status); });
  }


  /* ---------------------------------------------------------
     Carousels. The comps overflow the canvas with card rows, so
     these are scroll-snap tracks driven by prev/next buttons.
     --------------------------------------------------------- */
  function initCarousels(root) {
    root.querySelectorAll('[data-carousel]').forEach(function (el) {
      var track = el.querySelector('[data-carousel-track]');
      if (!track) return;
      var gap = parseFloat(el.dataset.carouselGap || '20');

      // the element that actually scrolls is sometimes the track's parent
      function scroller() {
        var n = track;
        while (n && n !== el.parentNode) {
          var ov = getComputedStyle(n).overflowX;
          if (ov === 'auto' || ov === 'scroll') return n;
          n = n.parentElement;
        }
        return el;
      }

      function step() {
        var card = track.firstElementChild;
        if (!card) return 0;
        var u = parseFloat(getComputedStyle(document.documentElement)
                 .getPropertyValue('--lv-u')) || 1;
        return card.getBoundingClientRect().width + gap * u;
      }

      function go(dir) {
        scroller().scrollBy({ left: dir * step(), behavior: reduce ? 'auto' : 'smooth' });
      }

      el.querySelectorAll('[data-carousel-prev]').forEach(function (b) {
        b.addEventListener('click', function () { go(-1); });
      });
      el.querySelectorAll('[data-carousel-next]').forEach(function (b) {
        b.addEventListener('click', function () { go(1); });
      });

      // Drag to scroll. Touch already does this natively, so this is for
      // pointer devices; scroll snapping is suspended while dragging or the
      // rail fights the pointer, and a short flick carries on with momentum.
      (function dragToScroll() {
        var down = false, moved = false, startX = 0, startLeft = 0;
        var lastX = 0, lastT = 0, velocity = 0, raf = 0;

        function glide() {
          var sc = scroller();
          velocity *= 0.95;
          sc.scrollLeft -= velocity * 16;
          if (Math.abs(velocity) > 0.02 && sc.scrollLeft > 0 &&
              sc.scrollLeft < sc.scrollWidth - sc.clientWidth) {
            raf = requestAnimationFrame(glide);
          } else {
            if (!el.dataset.carouselAuto && !el.hasAttribute('data-carousel-auto')) {
              sc.style.scrollSnapType = '';
            }
          }
        }

        track.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'touch' || e.button !== 0) return;
          var sc = scroller();
          if (sc.scrollWidth <= sc.clientWidth) return;
          cancelAnimationFrame(raf);
          down = true;
          moved = false;
          startX = lastX = e.clientX;
          startLeft = sc.scrollLeft;
          lastT = e.timeStamp;
          velocity = 0;
          sc.style.scrollSnapType = 'none';
        });

        track.addEventListener('pointermove', function (e) {
          if (!down) return;
          var dx = e.clientX - startX;
          if (!moved && Math.abs(dx) > 4) {
            moved = true;
            el.classList.add('is-dragging');
            track.setPointerCapture(e.pointerId);
          }
          if (!moved) return;
          scroller().scrollLeft = startLeft - dx;
          var dt = e.timeStamp - lastT;
          if (dt > 0) velocity = (e.clientX - lastX) / dt;
          lastX = e.clientX;
          lastT = e.timeStamp;
        });

        function release(e) {
          if (!down) return;
          down = false;
          el.classList.remove('is-dragging');
          if (!moved) {
            if (!el.dataset.carouselAuto && !el.hasAttribute('data-carousel-auto')) {
              scroller().style.scrollSnapType = '';
            }
            return;
          }
          // swallow the click that ends a drag, so a card does not navigate
          track.addEventListener('click', function swallow(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            track.removeEventListener('click', swallow, true);
          }, true);
          if (reduce || Math.abs(velocity) < 0.1) {
            if (!el.dataset.carouselAuto && !el.hasAttribute('data-carousel-auto')) {
              scroller().style.scrollSnapType = '';
            }
          } else {
            raf = requestAnimationFrame(glide);
          }
        }

        track.addEventListener('pointerup', release);
        track.addEventListener('pointercancel', release);
      })();

      // Some comps show the rail already scrolled; data-carousel-start says
      // how many cards in the design has it, so the load state matches.
      // the comps scroll the rail differently at each breakpoint
      var wide = window.matchMedia('(min-width: 1024px)').matches;
      var start = parseInt(
        (!wide && el.dataset.carouselStartMobile) || el.dataset.carouselStart || '0', 10);
      // the mobile comps sit between two snap points, so they give a raw
      // design-pixel offset instead of a card index
      var rawScroll = !wide && el.dataset.carouselScrollMobile
        ? parseFloat(el.dataset.carouselScrollMobile) : 0;
      if (rawScroll > 0) {
        var placeRaw = function () {
          var sc = scroller();
          sc.style.scrollSnapType = 'none';
          // design px -> css px, the same ratio --lv-u uses
          sc.scrollLeft = rawScroll *
            (Math.min(Math.max(document.documentElement.clientWidth, 360), 450) / 360);
        };
        if (document.readyState === 'complete') requestAnimationFrame(placeRaw);
        else window.addEventListener('load', function () { requestAnimationFrame(placeRaw); });
      } else if (start > 0) {
        var place = function () {
          var kids = Array.prototype.filter.call(track.children, function (k) { return !k.hidden; });
          if (kids.length > start) {
            var sc = scroller();
            var card = kids[start];
            sc.scrollLeft = card.offsetLeft;
          }
        };
        if (document.readyState === 'complete') requestAnimationFrame(place);
        else window.addEventListener('load', function () { requestAnimationFrame(place); });
      }

      // Automatic infinite repeating carousel loop
      if (el.dataset.carouselAuto === 'true' || el.hasAttribute('data-carousel-auto')) {
        var sc = scroller();
        sc.style.scrollSnapType = 'none';

        var originalChildren = Array.prototype.slice.call(track.children);
        var origCount = originalChildren.length;
        if (origCount > 0) {
          // Clone original items to create seamless loop
          // Ensure clones are marked .is-in immediately so they never render with opacity:0 / empty space
          originalChildren.forEach(function (c) {
            var clone = c.cloneNode(true);
            clone.setAttribute('aria-hidden', 'true');
            if (clone.classList.contains('lv-reveal')) {
              clone.classList.add('is-in');
            }
            clone.querySelectorAll('.lv-reveal').forEach(function (r) {
              r.classList.add('is-in');
            });
            track.appendChild(clone);
          });

          // Also make sure original children have .is-in once carousel enters view or scrolls
          var makeOriginalsVisible = function () {
            originalChildren.forEach(function (c) {
              if (c.classList.contains('lv-reveal')) c.classList.add('is-in');
              c.querySelectorAll('.lv-reveal').forEach(function (r) { r.classList.add('is-in'); });
            });
          };

          var autoPaused = false;
          var speed = parseFloat(el.dataset.carouselSpeed || '0.75');

          function autoLoop() {
            if (!autoPaused && !el.classList.contains('is-dragging')) {
              makeOriginalsVisible();
              var firstChild = track.children[0];
              var cloneFirst = track.children[origCount];
              var oneSetWidth = (cloneFirst && firstChild)
                ? (cloneFirst.offsetLeft - firstChild.offsetLeft)
                : 0;

              if (oneSetWidth > 0) {
                // a short set (few cards) must still out-scroll the viewport, or the wrap never fires
                while (sc.scrollWidth - sc.clientWidth < oneSetWidth + 2 * speed + 1) {
                  originalChildren.forEach(function (c) {
                    var k = c.cloneNode(true);
                    k.setAttribute('aria-hidden', 'true');
                    if (k.classList.contains('lv-reveal')) k.classList.add('is-in');
                    track.appendChild(k);
                  });
                }
                sc.scrollLeft += speed;
                if (sc.scrollLeft >= oneSetWidth) {
                  sc.scrollLeft -= oneSetWidth;
                } else if (sc.scrollLeft < 0) {
                  sc.scrollLeft += oneSetWidth;
                }
              }
            }
            requestAnimationFrame(autoLoop);
          }

          requestAnimationFrame(autoLoop);

          // Stop when hovered on any card/track, not the outer section
          track.addEventListener('mouseenter', function () { autoPaused = true; });
          track.addEventListener('mouseleave', function () { autoPaused = false; });
          track.addEventListener('touchstart', function () { autoPaused = true; }, { passive: true });
          track.addEventListener('touchend', function () {
            setTimeout(function () { autoPaused = false; }, 1500);
          }, { passive: true });
        }
      }

      function sync() {
        var sc = scroller();
        var max = sc.scrollWidth - sc.clientWidth - 1;
        el.querySelectorAll('[data-carousel-progress]').forEach(function (b) {
          // the comps draw this as a bar filling from the left, not a thumb
          var seen = (sc.scrollLeft + sc.clientWidth) / sc.scrollWidth;
          b.style.width = Math.min(100, seen * 100) + '%';
        });
        el.querySelectorAll('[data-carousel-prev]').forEach(function (b) {
          b.disabled = sc.scrollLeft <= 0;
        });
        el.querySelectorAll('[data-carousel-next]').forEach(function (b) {
          b.disabled = sc.scrollLeft >= max;
        });
      }
      scroller().addEventListener('scroll', sync, { passive: true });
      sync();
    });
  }

  /* ---------------------------------------------------------
     Category tabs — filter the cards in the following carousel
     --------------------------------------------------------- */
  function initTabs(root) {
    root.querySelectorAll('[data-tabs]').forEach(function (bar) {
      var scope = bar.parentElement;
      bar.querySelectorAll('[data-tab]').forEach(function (tab) {
        tab.addEventListener('click', function () {
          bar.querySelectorAll('[data-tab]').forEach(function (t) {
            t.classList.toggle('is-active', t === tab);
            t.setAttribute('aria-selected', String(t === tab));
          });
          var cat = tab.dataset.tab;
          var rail = scope.querySelector('[data-carousel-track]') || scope;

          function swap() {
            scope.querySelectorAll('[data-tab-cat]').forEach(function (card) {
              card.hidden = Boolean(cat && card.dataset.tabCat !== cat);
            });
            var sc = rail.parentElement && rail.parentElement.hasAttribute('data-carousel') ? rail.parentElement : rail;
            sc.scrollLeft = 0;
            var ev = new Event('scroll');
            sc.dispatchEvent(ev);
          }

          if (reduce) { swap(); return; }
          // cross-fade the rail rather than snapping the cards out
          rail.classList.add('is-swapping');
          setTimeout(function () {
            swap();
            requestAnimationFrame(function () {
              rail.classList.remove('is-swapping');
            });
          }, 180);
        });
      });
    });
  }

  /* ---------------------------------------------------------
     Before / after drag comparison
     --------------------------------------------------------- */
  function initBeforeAfter(root) {
    root.querySelectorAll('[data-before-after]').forEach(function (el) {
      var frame = el.querySelector('.lv-ba__frame');
      var scrim = el.querySelector('.lv-ba__scrim');
      var handle = el.querySelector('.lv-ba__handle');
      // separate photos: "After" sits on top and is clipped from the handle rightwards
      var after = el.querySelector('.lv-ba__after');
      var tagB = el.querySelector('.lv-ba__tag--b');
      var tagA = el.querySelector('.lv-ba__tag--a');
      if (!frame || !(scrim || after) || !handle) return;

      function set(pct) {
        pct = Math.min(100, Math.max(0, pct));
        if (scrim) scrim.style.width = pct + '%';
        if (after) {
          after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
          // a tag only shows while its own photo is still on screen
          var w = frame.getBoundingClientRect().width || 1;
          if (tagB) tagB.style.opacity = (pct / 100) * w > tagB.offsetLeft + tagB.offsetWidth * 0.5 ? 1 : 0;
          if (tagA) tagA.style.opacity = (1 - pct / 100) * w > (w - tagA.offsetLeft) - tagA.offsetWidth * 0.5 ? 1 : 0;
        }
        handle.style.left = pct + '%';
        handle.setAttribute('aria-valuenow', Math.round(pct));
      }

      function fromEvent(e) {
        var r = frame.getBoundingClientRect();
        set(((e.clientX - r.left) / r.width) * 100);
      }

      // Without these the browser starts a native image drag on mouse-down,
      // which cancels the pointer stream, so the slider only moved on click.
      // pan-y keeps vertical page scrolling on touch; sideways drags slide.
      frame.style.touchAction = 'pan-y';
      frame.addEventListener('dragstart', function (e) { e.preventDefault(); });
      frame.querySelectorAll('img').forEach(function (img) { img.draggable = false; });

      var dragging = false;
      frame.addEventListener('pointerdown', function (e) {
        if (e.button > 0) return;
        e.preventDefault();
        dragging = true;
        frame.setPointerCapture(e.pointerId);
        fromEvent(e);
      });
      frame.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
      frame.addEventListener('pointerup', function () { dragging = false; });
      frame.addEventListener('pointercancel', function () { dragging = false; });

      handle.addEventListener('keydown', function (e) {
        var now = parseFloat(handle.getAttribute('aria-valuenow') || '50');
        if (e.key === 'ArrowLeft') { set(now - 2); e.preventDefault(); }
        if (e.key === 'ArrowRight') { set(now + 2); e.preventDefault(); }
      });

      // start where the CSS draws the divider (the XERF mobile comp sits it off-centre)
      var fw = frame.getBoundingClientRect().width;
      var start = fw && scrim ? scrim.getBoundingClientRect().width / fw * 100 : 0;
      set(start > 0 && start < 100 ? start : 50);
    });
  }

  /* ---------------------------------------------------------
     Hero poster: the 360 and 1440 comps use different crops of
     the same footage, and <video poster> cannot be media-switched.
     --------------------------------------------------------- */
  function initHeroPoster(root) {
    var v = root.querySelector('[data-poster-mobile]');
    if (!v) return;
    var mq = window.matchMedia('(max-width: 1023px)');
    function apply() {
      v.poster = mq.matches ? v.dataset.posterMobile : v.dataset.posterDesktop;
    }
    mq.addEventListener('change', apply);
    apply();
  }

  /* ---------------------------------------------------------
     Before/after stack arrows. The comps draw rail arrows under the
     stack at both widths, so they step between the cards.
     --------------------------------------------------------- */
  function initResultsNav(root) {
    root.querySelectorAll('.lv-results').forEach(function (sec) {
      var grid = sec.querySelector('.lv-results__grid');
      if (!grid) return;
      var cards = Array.prototype.slice.call(grid.children);
      if (cards.length < 2) return;
      var at = 0;

      function go(step) {
        at = Math.min(cards.length - 1, Math.max(0, at + step));
        cards[at].scrollIntoView({
          behavior: reduce ? 'auto' : 'smooth',
          block: 'center', inline: 'center'
        });
        sec.querySelectorAll('[data-results-prev]').forEach(function (b) { b.disabled = at === 0; });
        sec.querySelectorAll('[data-results-next]').forEach(function (b) { b.disabled = at === cards.length - 1; });
      }

      sec.querySelectorAll('[data-results-prev]').forEach(function (b) {
        b.addEventListener('click', function () { go(-1); });
      });
      sec.querySelectorAll('[data-results-next]').forEach(function (b) {
        b.addEventListener('click', function () { go(1); });
      });
    });
  }

  /* ---------------------------------------------------------
     Location Pages — Interactive Services Tabs
     --------------------------------------------------------- */
  function initLocationServices(root) {
    root.querySelectorAll('.lv-locservices').forEach(function (sec) {
      var tabs = sec.querySelectorAll('[data-service-tab]');
      var titleEl = sec.querySelector('.lv-locservices__spotlight-title');
      var descEl = sec.querySelector('.lv-locservices__spotlight-desc');
      var ctaEl = sec.querySelector('.lv-locservices__cta');
      if (!tabs.length || !titleEl || !descEl) return;

      // phones: the open description sits directly under its own tab
      var spot = sec.querySelector('.lv-locservices__spotlight');
      var body = sec.querySelector('.lv-locservices__body');
      var mq = window.matchMedia('(max-width: 1023.98px)');
      function place() {
        if (!spot || !body) return;
        var li = sec.querySelector('.lv-locservices__list li.is-active');
        if (mq.matches && li) li.appendChild(spot); else body.appendChild(spot);
      }
      place();
      mq.addEventListener('change', place);

      tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
          tabs.forEach(function (t) {
            t.classList.remove('is-active');
            t.setAttribute('aria-selected', 'false');
            var parentLi = t.closest('li');
            if (parentLi) parentLi.classList.remove('is-active');
          });

          tab.classList.add('is-active');
          tab.setAttribute('aria-selected', 'true');
          var parentLi = tab.closest('li');
          if (parentLi) parentLi.classList.add('is-active');
          place();

          var newTitle = tab.getAttribute('data-title');
          var newDesc = tab.getAttribute('data-desc');
          var newHref = tab.getAttribute('data-href');

          titleEl.style.opacity = '0';
          descEl.style.opacity = '0';
          setTimeout(function () {
            if (newTitle) titleEl.textContent = newTitle;
            if (newDesc) descEl.textContent = newDesc;
            if (ctaEl && newHref) ctaEl.setAttribute('href', newHref);
            titleEl.style.opacity = '1';
            descEl.style.opacity = '1';
          }, 180);
        });
      });
    });
  }

  /* ---------------------------------------------------------
     Treatment Areas (Interactive Hotspots & Accordion List)
     Used on Injectables & other treatment pages with .lv-tareas
     --------------------------------------------------------- */
  /* Recommended tiles on small screens: first tap opens the tile and its
     button, the button (or a second tap) follows the link. */
  function initTileTap(root) {
    var mq = window.matchMedia('(max-width: 1023px)');
    root.querySelectorAll('.lv-tiles--inj .lv-tile, .lv-related--tap .lv-rcard').forEach(function (tile) {
      tile.addEventListener('click', function (e) {
        if (!mq.matches || tile.classList.contains('is-active') || e.target.closest('.lv-tile__more, .lv-btn')) return;
        e.preventDefault();
        tile.parentElement.querySelectorAll('.is-active').forEach(function (t) { t.classList.remove('is-active'); });
        tile.classList.add('is-active');
      });
    });
  }

  function initTareas(root) {
    root.querySelectorAll('.lv-tareas').forEach(function (sec) {
      var items = Array.prototype.slice.call(sec.querySelectorAll('.lv-tarea'));
      var dots = Array.prototype.slice.call(sec.querySelectorAll('.lv-tareas__dot'));
      var tag = sec.querySelector('.lv-tareas__tag');
      if (!items.length) return;

      // A tag near the right edge of the photo opens to the left of its point instead.
      function fitTag() {
        if (!tag) return;
        var media = tag.parentElement;
        tag.classList.remove('lv-tareas__tag--left');
        var mq = window.matchMedia('(max-width: 1023px)').matches;
        var pct = parseFloat(getComputedStyle(tag).getPropertyValue(mq ? '--mpx' : '--px')) || 0;
        if (pct / 100 * media.clientWidth + tag.offsetWidth > media.clientWidth - 8) {
          tag.classList.add('lv-tareas__tag--left');
        }
      }

      // the pill hangs off the point itself, so the hairline always meets it
      function syncTag() {
        var on = sec.querySelector('.lv-tareas__dot--on');
        if (!tag || !on) return;
        ['--x:--px', '--y:--py', '--mx:--mpx', '--my:--mpy'].forEach(function (m) {
          var k = m.split(':'), v = on.style.getPropertyValue(k[0]);
          if (v) tag.style.setProperty(k[1], v);
        });
      }

      function setActive(targetItem) {
        if (!targetItem) return;

        items.forEach(function (item) {
          if (item === targetItem) {
            item.classList.add('lv-tarea--open');
          } else {
            item.classList.remove('lv-tarea--open');
          }
        });

        var name = (targetItem.getAttribute('data-name') || '').trim();

        dots.forEach(function (dot) {
          var dotName = (dot.getAttribute('data-name') || dot.getAttribute('aria-label') || '').trim();
          var useEl = dot.querySelector('use');
          if (dotName === name) {
            dot.classList.add('lv-tareas__dot--on');
            if (useEl) useEl.setAttribute('href', '#remove-9x9');
          } else {
            dot.classList.remove('lv-tareas__dot--on');
            if (useEl) useEl.setAttribute('href', '#add-9x9');
          }
        });

        if (tag) {
          var titleEl = targetItem.querySelector('.lv-tarea__name');
          var titleText = name || (titleEl ? titleEl.textContent.trim() : '');

          var px = targetItem.getAttribute('data-px');
          var py = targetItem.getAttribute('data-py');
          var mpx = targetItem.getAttribute('data-mpx');
          var mpy = targetItem.getAttribute('data-mpy');

          if (titleText) tag.textContent = titleText;
          if (px) tag.style.setProperty('--px', px);
          if (py) tag.style.setProperty('--py', py);
          if (mpx) tag.style.setProperty('--mpx', mpx);
          if (mpy) tag.style.setProperty('--mpy', mpy);
          syncTag();
          fitTag();
        }
      }
      syncTag();
      fitTag();
      window.addEventListener('resize', fitTag);

      items.forEach(function (item) {
        item.addEventListener('click', function (e) {
          if (e.target.closest('.lv-tarea__cta')) return;
          setActive(item);
        });
      });

      dots.forEach(function (dot) {
        dot.addEventListener('click', function (e) {
          e.stopPropagation();
          var dotName = (dot.getAttribute('data-name') || dot.getAttribute('aria-label') || '').trim();
          var matchedItem = null;
          for (var i = 0; i < items.length; i++) {
            if ((items[i].getAttribute('data-name') || '').trim() === dotName) {
              matchedItem = items[i];
              break;
            }
          }
          if (matchedItem) setActive(matchedItem);
        });
      });
    });
  }

  /* ---------------------------------------------------------
     XERF / Treatment Concerns (Interactive List)
     --------------------------------------------------------- */
  function initConcerns(root) {
    root.querySelectorAll('.lv-concerns').forEach(function (sec) {
      var items = sec.querySelectorAll('.lv-concern');
      if (!items.length) return;

      items.forEach(function (item) {
        item.addEventListener('click', function () {
          var isOpen = item.classList.contains('lv-concern--open');
          items.forEach(function (other) { other.classList.remove('lv-concern--open'); });
          if (!isOpen) item.classList.add('lv-concern--open');
          // each concern has its own before / after pair
          if (!isOpen && item.dataset.baBefore) {
            var before = sec.querySelector('.lv-ba__before');
            var after = sec.querySelector('.lv-ba__after');
            var cap = sec.querySelector('.lv-concerns__caption');
            if (before) before.src = item.dataset.baBefore;
            if (after) after.src = item.dataset.baAfter;
            if (cap && item.dataset.baCaption) cap.textContent = item.dataset.baCaption;
          }
        });
      });
    });
  }

  /* ---------------------------------------------------------
     Favicon theme switcher (Dark / Light mode)
     --------------------------------------------------------- */
  function initFavicon() {
    if (!window.matchMedia) return;
    var darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    function updateFavicon() {
      var isDark = darkQuery.matches;
      var links = document.querySelectorAll('link[rel*="icon"]');
      links.forEach(function (link) {
        var href = link.getAttribute('href');
        if (!href) return;
        if (isDark) {
          if (href.indexOf('favicon-light.ico') !== -1) {
            link.href = href.replace('favicon-light.ico', 'favicon-dark.ico');
          } else if (href.indexOf('favicon.ico') !== -1 && href.indexOf('favicon-dark.ico') === -1) {
            link.href = href.replace('favicon.ico', 'favicon-dark.ico');
          }
        } else {
          if (href.indexOf('favicon-dark.ico') !== -1) {
            link.href = href.replace('favicon-dark.ico', 'favicon-light.ico');
          }
        }
      });
    }
    if (darkQuery.addEventListener) {
      darkQuery.addEventListener('change', updateFavicon);
    } else if (darkQuery.addListener) {
      darkQuery.addListener(updateFavicon);
    }
    updateFavicon();
  }

  function boot() {
    var root = document;
    initFavicon();
    initAnnounce(root);
    initDropdowns(root);
    initDrawer(root);
    initReveal(root);
    initAccordions(root);
    initForms(root);
    initCarousels(root);
    initTabs(root);
    initBeforeAfter(root);
    initResultsNav(root);
    initHeroPoster(root);
    initLocationServices(root);
    initTareas(root);
    initTileTap(root);
    initConcerns(root);
  }

  if (document.querySelector('script[src*="include.js"]') && document.documentElement.getAttribute('data-lv-partials') !== 'done') {
    document.addEventListener('lv:partials-loaded', boot);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  // About "Read more": native <dialog> popup per person
  document.addEventListener('click', function (e) {
    var open = e.target.closest('[data-person-open]');
    var dlg = open ? open.parentNode.querySelector('.lv-pmodal') : null;
    if (dlg) { dlg.showModal(); document.documentElement.classList.add('lv-noscroll'); return; }
    var d = e.target.closest('.lv-pmodal');
    if (e.target.closest('[data-person-close]') || e.target === d) d.close();
  });
  document.addEventListener('close', function (e) {
    if (e.target.classList && e.target.classList.contains('lv-pmodal')) {
      document.documentElement.classList.remove('lv-noscroll');
    }
  }, true);
  // Blog article: share buttons + table-of-contents scroll spy
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-share]');
    if (!b) return;
    var kind = b.getAttribute('data-share');
    var url = encodeURIComponent(location.href.split('#')[0]);
    var title = encodeURIComponent(document.title);
    if (kind === 'linkedin' || kind === 'x') {
      e.preventDefault();
      window.open(kind === 'linkedin'
        ? 'https://www.linkedin.com/sharing/share-offsite/?url=' + url
        : 'https://twitter.com/intent/tweet?url=' + url + '&text=' + title,
        '_blank', 'noopener,noreferrer,width=640,height=640');
    } else if (kind === 'instagram') {
      // Instagram has no web share intent: copy the link and say so
      e.preventDefault();
      var done = function () {
        var tip = b.querySelector('.lv-share__tip');
        if (!tip) { tip = document.createElement('span'); tip.className = 'lv-share__tip'; tip.textContent = 'Link copied'; b.appendChild(tip); }
        tip.classList.add('is-on');
        setTimeout(function () { tip.classList.remove('is-on'); }, 1600);
      };
      var href = location.href.split('#')[0];
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(href).then(done, done);
      } else {
        var t = document.createElement('textarea'); t.value = href; document.body.appendChild(t);
        t.select(); try { document.execCommand('copy'); } catch (x) {} document.body.removeChild(t); done();
      }
    }
  });

  (function tocSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-toc] .lv-toc__link'));
    if (!links.length) return;
    var pairs = links.map(function (a) {
      var id = (a.getAttribute('href') || '').split('#')[1];
      return { a: a, t: id ? document.getElementById(id) : null };
    }).filter(function (p) { return p.t; });
    if (!pairs.length) return;
    var ticking = false;
    function update() {
      ticking = false;
      var line = window.innerHeight * 0.3, cur = pairs[0];
      pairs.forEach(function (p) { if (p.t.getBoundingClientRect().top <= line) cur = p; });
      pairs.forEach(function (p) { p.a.classList.toggle('is-active', p === cur); });
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    window.addEventListener('load', update);
    update();
  })();
})();
